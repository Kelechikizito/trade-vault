// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test, console2} from "forge-std/Test.sol";
import {Escrow} from "src/Escrow.sol";
import {Vault} from "src/Vault.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";

contract EscrowTest is Test {
    Escrow escrow;
    Vault vault;
    ERC20Mock usdc;

    address public OWNER = makeAddr("owner");
    address public BUYER = makeAddr("buyer");
    address public SUPPLIER = makeAddr("supplier");
    address public ARBITER = makeAddr("arbiter");

    address public PLACEHOLDER = makeAddr("placeholder");

    uint256 OWNER_USDC_BALANCE = 10_000e6;
    uint256 OWNER_ETH_BALANCE = 1 ether;

    uint256 BUYER_USDC_BALANCE = 10_000e6;
    uint256 BUYER_ETH_BALANCE = 1 ether;

    uint256 SUPPLIER_USDC_BALANCE = 10_000e6;
    uint256 SUPPLIER_ETH_BALANCE = 1 ether;

    uint256 ARBITER_USDC_BALANCE = 10_000e6;
    uint256 ARBITER_ETH_BALANCE = 1 ether;

    function setUp() public {
        usdc = new ERC20Mock();
        
        vm.prank(OWNER);
        vault = new Vault(address(usdc), PLACEHOLDER);
        vm.prank(OWNER);
        escrow = new Escrow(address(vault));
    }

    function testChangeEscrowAddressFromPlaceholderToActual() external {
        vm.prank(OWNER);
        vault.setEscrow(address(escrow));
    }
}
