*Code pointers and analysis is approximate and best effort since Stable is not open source but the triggers and symptoms were tested empirically on a local devnet*


---
Bug: Mixing native value transfer and USDT0 ERC20 transfer can lead to tx level panic, when an account's USDT0 balance is cleared with native value transfer then refilled with USDT0 contract transfer in the same tx.
---

**Root cause**: native value transfers and USDT0 contract transfers use the same stateDB but native transfer disables gas refund temporarily during its USDT0 transfer call, if a later call tries to undo the gas refund it will panic.

**PoC**: Deploy this GasRefund contract on a local testnet, then send 3 txs

```
pragma solidity ^0.8.25;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address who) external view returns (uint256);
}

contract GasRefund {
    address constant USDT0 = 0x779Ded0c9e1022225f8E0630b35a9b54bE713736;

    receive() external payable {}

    function execute(address payable sink, address funder) external {
        // 1) transfer away ALL native balance, make sure before execute this contract has more than 1e12 wei value 
        // This will eventually call USDT0.transfer, clearing the balance storage slot for this contract
        // However gas refund will be disabled temporarily, not issuing the slot clearing refund like geth normally does
        (bool ok, ) = sink.call{value: address(this).balance}("");
        require(ok, "send");

        // 2) re-fund via ERC20 transferFrom (SSTORE "recreate slot" -> SubRefund(4800) underflow -> panic)
        // Statedb will try to undo the SSTORE gas refund because contract's ERC20 balance slot is non-zero now, but the refund was never issued
        // This doesn't have to be transferFrom, it can also be another sender calling transfer towards here
        require(IERC20(USDT0).transferFrom(funder, address(this), 1000000), "transferFrom");
    }
}
```

- Fund the deployed GasRefund contract with 1 USDT0 

`cast send $USDT0 "transfer(address,uint256)" $CONTRACT 1000000`

- Approve the contract to use test account USDT0 

`cast send $USDT0 "approve(address,uint256)" $CONTRACT 1000000`

- Trigger the execute function

`cast send $R "execute(address,address)" 0x...beef $TESTWALLET`

Execution in the USDT0.transferFrom will panic in StateDB.subRefund and throw
"Refund counter below zero ....", the panic is recovered by baseApp and turned into a failed cosmos Tx

**Impact (Correctness and wasted resources)**:
- *Unexpected transaction failure since USDT0 and gas token equivalence is a supported feature on Stable.*
- *Ghost tx: this failed tx has no trace in evm, RPC queries like eth_getTransactionReceipt can't find it but sender nonce advances and full gas limit is consumed*
- *The only trace is in the cosmos rpc but there is no public cosmos rpc for stable, making it hard to diagnose*

**Fix**:
Without access to the source code it's hard to propose a fix as I am not sure why/how gas refund is disabled when USDT0 is called indirectly through native value transfer.

An working fix should check if a gas refund was skipped before trying to undo it.
