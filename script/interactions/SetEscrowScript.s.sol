// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script} from "forge-std/Script.sol";
import {Escrow} from "src/Escrow.sol";
import {Vault} from "src/Vault.sol";
import {DevOpsTools} from "foundry-devops/src/DevOpsTools.sol";

contract SetEscrowScript is Script {
    // address mostRecentlyDeployed = DevOpsTools.get_most_recent_deployment("Vault", block.chainid);

    function run(address vaultAddress, address escrowAddress) public {
        setEscrow(vaultAddress, escrowAddress);
    }

    function setEscrow(address vaultAddress, address escrowAddress) public {
        vm.startBroadcast();
        Vault(vaultAddress).setEscrow(escrowAddress);
        vm.stopBroadcast();
    }
}