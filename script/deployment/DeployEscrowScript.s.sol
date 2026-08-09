// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script} from "forge-std/Script.sol";
import {Escrow} from "src/Escrow.sol";
import {Vault} from "src/Vault.sol";
import {DevOpsTools} from "foundry-devops/src/DevOpsTools.sol";

contract DeployEscrowScript is Script {
    function run() public returns (Escrow) {
        address mostRecentlyDeployedVault = DevOpsTools.get_most_recent_deployment("Vault", block.chainid);
        return deployEscrow(mostRecentlyDeployedVault);
    }

    function deployEscrow(address vaultAddress) public returns (Escrow) {
        vm.startBroadcast();
        Escrow escrow = new Escrow(vaultAddress);
        vm.stopBroadcast();
        return escrow;
    }
}
