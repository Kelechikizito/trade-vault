// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script} from "forge-std/Script.sol";
import {Escrow} from "src/Escrow.sol";
import {Vault} from "src/Vault.sol";
import {DevOpsTools} from "foundry-devops/src/DevOpsTools.sol";

contract SetEscrowScript is Script {
    function run() public {
        address mostRecentlyDeployedVault = DevOpsTools.get_most_recent_deployment("Vault", block.chainid);
        address mostRecentlyDeployedEscrow = DevOpsTools.get_most_recent_deployment("Escrow", block.chainid);
        setEscrow(mostRecentlyDeployedVault, mostRecentlyDeployedEscrow);
    }

    function setEscrow(address vaultAddress, address escrowAddress) public {
        vm.startBroadcast();
        Vault(vaultAddress).setEscrow(escrowAddress);
        vm.stopBroadcast();
    }
}
