// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test, console2} from "forge-std/Test.sol";
import {DeployEscrowScript} from "script/deployment/DeployEscrowScript.s.sol";
import {DeployVaultScript} from "script/deployment/DeployVaultScript.s.sol";
import {SetEscrowScript} from "script/interactions/SetEscrowScript.s.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";
import {Vault} from "src/Vault.sol";
import {Escrow} from "src/Escrow.sol";




contract VaultTest is Test {
    ERC20Mock usdc;

    DeployVaultScript deployVaultScript;
    DeployEscrowScript deployEscrowScript;
    SetEscrowScript setEscrowScript;

    address public DUMMY_ESCROW = makeAddr("DUMMY_ESCROW");
    address OWNER = makeAddr("OWNER");

    function setUp() public {
        usdc = new ERC20Mock();

        // vm.startPrank(OWNER);
        deployVaultScript = new DeployVaultScript();
        deployEscrowScript = new DeployEscrowScript();
        setEscrowScript = new SetEscrowScript();
        // vm.stopPrank();
    }

    function testDeployContractsAndSetEscrowScript() external {
        Vault VaultAddress = deployVaultScript.run(address(usdc), DUMMY_ESCROW);
        Escrow EscrowAddress = deployEscrowScript.run(address(VaultAddress));
        setEscrowScript.run(address(VaultAddress), address(EscrowAddress));
    }
}
