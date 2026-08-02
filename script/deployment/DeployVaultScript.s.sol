// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script} from "forge-std/Script.sol";
import {Vault} from "src/Vault.sol";
import {DevOpsTools} from "foundry-devops/src/DevOpsTools.sol";

contract DeployVaultScript is Script {
    function run(address ercToken, address dummyEscrow) public returns (Vault) {
        return deployVault(ercToken, dummyEscrow);
    }

    function deployVault(address ercToken, address dummyEscrow) public returns (Vault) {
        vm.startBroadcast();
        Vault vault = new Vault(ercToken, dummyEscrow);
        vm.stopBroadcast();
        return vault;
    }
}
