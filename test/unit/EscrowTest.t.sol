// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test, console2} from "forge-std/Test.sol";
import {Escrow} from "src/Escrow.sol";
import {Vault} from "src/Vault.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";



contract EscrowTest is Test {
    using SafeERC20 for IERC20;

    Escrow escrow;
    Vault vault;
    ERC20Mock usdc;
    uint256 arcTestnetFork;

    address public OWNER = makeAddr("owner");
    address public BUYER = makeAddr("buyer");
    address public SUPPLIER = makeAddr("supplier");
    address public ARBITER = makeAddr("arbiter");

    address public PLACEHOLDER = makeAddr("placeholder");

    uint256 OWNER_USDC_BALANCE = 10_000e6;
    uint256 OWNER_ETH_BALANCE = 1 ether;

    uint256 BUYER_USDC_BALANCE = 100_000e6;
    uint256 BUYER_ETH_BALANCE = 1 ether;

    uint256 SUPPLIER_USDC_BALANCE = 10_000e6;
    uint256 SUPPLIER_ETH_BALANCE = 1 ether;

    uint256 ARBITER_USDC_BALANCE = 10_000e6;
    uint256 ARBITER_ETH_BALANCE = 1 ether;

    uint256 tradeId;

    function setUp() public {
        usdc = new ERC20Mock();
        
        vm.prank(OWNER);
        vault = new Vault(address(usdc), PLACEHOLDER);


        vm.prank(OWNER);
        escrow = new Escrow(address(vault));

        vm.prank(OWNER);
        vault.setEscrow(address(escrow));

        deal(address(usdc), BUYER, BUYER_USDC_BALANCE);
    }

    
    /*//////////////////////////////////////////////////////////////
                            HAPPY PATH TESTS
    //////////////////////////////////////////////////////////////*/
    function testCreateTradeIsSuccessful() external {
        // ARRANGE
        uint256 tradeAmount = 10e6;
        uint256 tradeDeadline = block.timestamp + 1 weeks;
        vm.deal(BUYER, BUYER_ETH_BALANCE);

        // ACT
        vm.prank(BUYER);
        tradeId = escrow.createTrade(BUYER, SUPPLIER, tradeAmount, ARBITER, tradeDeadline);

        // ASSERT
        assertEq(tradeId, 0);

    }

    modifier createTradeSuccessfully() {
        // ARRANGE
        uint256 tradeAmount = 10e6;
        uint256 tradeDeadline = block.timestamp + 1 weeks;
        vm.deal(BUYER, BUYER_ETH_BALANCE);

        // ACT
        vm.prank(BUYER);
        tradeId = escrow.createTrade(BUYER, SUPPLIER, tradeAmount, ARBITER, tradeDeadline);
        _;
    }

    function testFundTradeIsSuccessful() external createTradeSuccessfully() {
        // ARRANGE

        // ACT
        vm.prank(BUYER);
        IERC20(address(usdc)).forceApprove(address(vault), BUYER_USDC_BALANCE);

        vm.prank(BUYER);
        escrow.fundTrade(tradeId);

        // ASSERT
        assertEq(uint8(escrow.getTradeStatus(tradeId)), uint8(Escrow.Status.Funded));
    }

    modifier createAndFundTradeSuccessfully() {
        // ARRANGE
        uint256 tradeAmount = 10e6;
        uint256 tradeDeadline = block.timestamp + 1 weeks;
        vm.deal(BUYER, BUYER_ETH_BALANCE);

        // ACT
        vm.prank(BUYER);
        tradeId = escrow.createTrade(BUYER, SUPPLIER, tradeAmount, ARBITER, tradeDeadline);

        vm.prank(BUYER);
        IERC20(address(usdc)).forceApprove(address(vault), BUYER_USDC_BALANCE);

        vm.prank(BUYER);
        escrow.fundTrade(tradeId);
        _;
    }

    function testMeetTradeConditionsIsSuccessful() external createAndFundTradeSuccessfully() {
        // ARRANGE

        // ACT
        vm.prank(ARBITER);
        escrow.confirmGoodsReceived(tradeId, true);
        vm.prank(ARBITER);
        escrow.confirmCustomsCleared(tradeId, true);
        vm.prank(ARBITER);
        escrow.confirmShipped(tradeId, true);

        vm.prank(ARBITER);
        escrow.meetTradeConditions(tradeId);

        // ASSERT
        assertEq(uint8(escrow.getTradeStatus(tradeId)), uint8(Escrow.Status.ConditionsMet));

    }

    modifier meetTradeConditionsSuccessfully() {
        // ARRANGE
        uint256 tradeAmount = 10e6;
        uint256 tradeDeadline = block.timestamp + 1 weeks;
        vm.deal(BUYER, BUYER_ETH_BALANCE);

        // ACT
        vm.prank(BUYER);
        tradeId = escrow.createTrade(BUYER, SUPPLIER, tradeAmount, ARBITER, tradeDeadline);

        vm.prank(BUYER);
        IERC20(address(usdc)).forceApprove(address(vault), BUYER_USDC_BALANCE);

        vm.prank(BUYER);
        escrow.fundTrade(tradeId);

        vm.prank(ARBITER);
        escrow.confirmGoodsReceived(tradeId, true);
        vm.prank(ARBITER);
        escrow.confirmCustomsCleared(tradeId, true);
        vm.prank(ARBITER);
        escrow.confirmShipped(tradeId, true);

        vm.prank(ARBITER);
        escrow.meetTradeConditions(tradeId);
        _;
    }

    function testConfirmDeliveryIsSuccessful() external meetTradeConditionsSuccessfully() {
        // ARRANGE
        uint256 tradeAmount = 10e6;

        // ACT
        vm.prank(ARBITER);
        escrow.confirmDelivery(tradeId);

        // ASSERT
        assertEq(usdc.balanceOf(SUPPLIER), tradeAmount);
        console2.log("Supplier has successfully recieved payment for the goods supplied to the buyer");
        console2.log("Supplier recieved", (tradeAmount / 1e6), "USDC, after successful delivery confirmation by the third-party arbiter.");
    }

    modifier confirmDeliverySuccessfully() {
        // ARRANGE
        uint256 tradeAmount = 10e6;
        uint256 tradeDeadline = block.timestamp + 1 weeks;
        vm.deal(BUYER, BUYER_ETH_BALANCE);

        // ACT
        vm.prank(BUYER);
        tradeId = escrow.createTrade(BUYER, SUPPLIER, tradeAmount, ARBITER, tradeDeadline);

        vm.prank(BUYER);
        IERC20(address(usdc)).forceApprove(address(vault), BUYER_USDC_BALANCE);

        vm.prank(BUYER);
        escrow.fundTrade(tradeId);

        vm.prank(ARBITER);
        escrow.confirmGoodsReceived(tradeId, true);
        vm.prank(ARBITER);
        escrow.confirmCustomsCleared(tradeId, true);
        vm.prank(ARBITER);
        escrow.confirmShipped(tradeId, true);

        vm.prank(ARBITER);
        escrow.meetTradeConditions(tradeId);

        vm.prank(ARBITER);
        escrow.confirmDelivery(tradeId);
        _;
    }

    /*//////////////////////////////////////////////////////////////
                        REVERT STATEMENT TESTS
    //////////////////////////////////////////////////////////////*/
    function testCreateTradeRevertsIfBuyerIsAddressZero() external {
        // ARRANGE
        uint256 tradeAmount = 10e6;
        uint256 tradeDeadline = block.timestamp + 1 weeks;
        vm.deal(BUYER, BUYER_ETH_BALANCE);

        // ACT & ASSERT
        vm.prank(BUYER);
        vm.expectRevert();
        tradeId = escrow.createTrade(address(0), SUPPLIER, tradeAmount, ARBITER, tradeDeadline);
    }

    function testCreateTradeRevertsIfSupplierIsAddressZero() external {
        // ARRANGE
        uint256 tradeAmount = 10e6;
        uint256 tradeDeadline = block.timestamp + 1 weeks;
        vm.deal(BUYER, BUYER_ETH_BALANCE);

        // ACT & ASSERT
        vm.prank(BUYER);
        vm.expectRevert();
        tradeId = escrow.createTrade(BUYER, address(0), tradeAmount, ARBITER, tradeDeadline);
    }

    function testCreateTradeRevertsIfArbiterIsAddressZero() external {
        // ARRANGE
        uint256 tradeAmount = 10e6;
        uint256 tradeDeadline = block.timestamp + 1 weeks;
        vm.deal(BUYER, BUYER_ETH_BALANCE);

        // ACT & ASSERT
        vm.prank(BUYER);
        vm.expectRevert();
        tradeId = escrow.createTrade(BUYER, SUPPLIER, tradeAmount, address(0), tradeDeadline);
    }

    function testCreateTradeRevertsIfTradeAmountIsZero() external {
        // ARRANGE
        uint256 tradeAmount = 0;
        uint256 tradeDeadline = block.timestamp + 1 weeks;
        vm.deal(BUYER, BUYER_ETH_BALANCE);

        // ACT & ASSERT
        vm.prank(BUYER);
        vm.expectRevert();
        tradeId = escrow.createTrade(BUYER, SUPPLIER, tradeAmount, ARBITER, tradeDeadline);
    }

    function testCreateTradeRevertsIfTradeDeadlineIsInThePast() external {
        // ARRANGE
        uint256 tradeAmount = 10e6;
        uint256 tradeDeadline = block.timestamp - 1;
        vm.deal(BUYER, BUYER_ETH_BALANCE);

        // ACT & ASSERT
        vm.prank(BUYER);
        vm.expectRevert();
        tradeId = escrow.createTrade(BUYER, SUPPLIER, tradeAmount, ARBITER, tradeDeadline);
    }

    function testCreateTradeRevertsIfSupplierIsBuyer() external {
        // ARRANGE
        uint256 tradeAmount = 10e6;
        uint256 tradeDeadline = block.timestamp + 1 weeks;
        vm.deal(BUYER, BUYER_ETH_BALANCE);

        // ACT & ASSERT
        vm.prank(BUYER);
        vm.expectRevert();
        tradeId = escrow.createTrade(BUYER, BUYER, tradeAmount, ARBITER, tradeDeadline);
    }

    function testCreateTradeRevertsIfArbiterIsBuyer() external {
        // ARRANGE
        uint256 tradeAmount = 10e6;
        uint256 tradeDeadline = block.timestamp + 1 weeks;
        vm.deal(BUYER, BUYER_ETH_BALANCE);

        // ACT & ASSERT
        vm.prank(BUYER);
        vm.expectRevert();
        tradeId = escrow.createTrade(BUYER, SUPPLIER, tradeAmount, BUYER, tradeDeadline);
    }

    function testCreateTradeRevertsIfArbiterIsSupplier() external {
        // ARRANGE
        uint256 tradeAmount = 10e6;
        uint256 tradeDeadline = block.timestamp + 1 weeks;
        vm.deal(BUYER, BUYER_ETH_BALANCE);

        // ACT & ASSERT
        vm.prank(BUYER);
        vm.expectRevert();
        tradeId = escrow.createTrade(BUYER, SUPPLIER, tradeAmount, SUPPLIER, tradeDeadline);
    }

    function testCreateTradeRevertsIfBuyerNotMsgSender() external {
        // ARRANGE
        uint256 tradeAmount = 10e6;
        uint256 tradeDeadline = block.timestamp + 1 weeks;
        vm.deal(BUYER, BUYER_ETH_BALANCE);

        // ACT & ASSERT
        vm.prank(SUPPLIER);
        vm.expectRevert();
        tradeId = escrow.createTrade(BUYER, SUPPLIER, tradeAmount, ARBITER, tradeDeadline);
    }

    function testFundTradeRevertsIfInvalidTradeId() external {
        // ARRANGE
        uint256 invalidTradeId = 999;

        // ACT & ASSERT
        vm.prank(BUYER);
        vm.expectRevert();
        escrow.fundTrade(invalidTradeId);
    }

    function testFundTradeRevertsIfTradeAlreadyFunded() external createAndFundTradeSuccessfully() {
        // ACT & ASSERT
        vm.prank(BUYER);
        vm.expectRevert();
        escrow.fundTrade(tradeId);
    }

    function testFundTradeRevertsIfMsgSenderIsNotBuyer() external createTradeSuccessfully() {
        // ACT & ASSERT
        vm.prank(SUPPLIER);
        vm.expectRevert();
        escrow.fundTrade(tradeId);
    }

    function testFundTradeRevertsIfDeadlineHasPassed() external createTradeSuccessfully() {
        // ARRANGE
        vm.warp(block.timestamp + 2 weeks);

        // ACT & ASSERT
        vm.prank(BUYER);
        vm.expectRevert();
        escrow.fundTrade(tradeId);
    }


    function testConfirmGoodsReceivedRevertsIfInvalidTradeId() external createAndFundTradeSuccessfully() {
        // ARRANGE
        uint256 invalidTradeId = 999;

        // ACT & ASSERT
        vm.prank(ARBITER);
        vm.expectRevert();
        escrow.confirmGoodsReceived(invalidTradeId, true);
    }

    function testConfirmGoodsReceivedRevertsIfMsgSenderIsNotArbiter() external createAndFundTradeSuccessfully() {
        // ACT & ASSERT
        vm.prank(SUPPLIER);
        vm.expectRevert();
        escrow.confirmGoodsReceived(tradeId, true);
    }

    function testConfirmGoodsReceivedRevertsIfTradeNotFunded() external createTradeSuccessfully() {
        // ACT & ASSERT
        vm.prank(ARBITER);
        vm.expectRevert();
        escrow.confirmGoodsReceived(tradeId, true);
    }

    function testConfirmGoodsReceivedRevertsIfInvalidDeadline() external createAndFundTradeSuccessfully() {
        // ARRANGE
        vm.warp(block.timestamp + 2 weeks);

        // ACT & ASSERT
        vm.prank(ARBITER);
        vm.expectRevert();
        escrow.confirmGoodsReceived(tradeId, true);
    }

    function testConfirmGoodsReceivedRevertsIfNotConfirmed() external createAndFundTradeSuccessfully() {
        // ACT & ASSERT
        vm.prank(ARBITER);
        vm.expectRevert();
        escrow.confirmGoodsReceived(tradeId, false);
    }


    function testConfirmCustomsClearedRevertsIfInvalidTradeId() external createAndFundTradeSuccessfully() {
        // ARRANGE
        uint256 invalidTradeId = 999;

        // ACT & ASSERT
        vm.prank(ARBITER);
        vm.expectRevert();
        escrow.confirmCustomsCleared(invalidTradeId, true);
    }

    function testConfirmCustomsClearedRevertsIfMsgSenderIsNotArbiter() external createAndFundTradeSuccessfully() {
        // ACT & ASSERT
        vm.prank(SUPPLIER);
        vm.expectRevert();
        escrow.confirmCustomsCleared(tradeId, true);
    }

    function testConfirmCustomsClearedRevertsIfTradeNotFunded() external createTradeSuccessfully() {
        // ACT & ASSERT
        vm.prank(ARBITER);
        vm.expectRevert();
        escrow.confirmCustomsCleared(tradeId, true);
    }

    function testConfirmCustomsClearedRevertsIfInvalidDeadline() external createAndFundTradeSuccessfully() {
        // ARRANGE
        vm.warp(block.timestamp + 2 weeks);

        // ACT & ASSERT
        vm.prank(ARBITER);
        vm.expectRevert();
        escrow.confirmCustomsCleared(tradeId, true);
    }

    function testConfirmCustomsClearedRevertsIfNotConfirmed() external createAndFundTradeSuccessfully() {
        // ACT & ASSERT
        vm.prank(ARBITER);
        vm.expectRevert();
        escrow.confirmCustomsCleared(tradeId, false);
    }

    function testConfirmShippedRevertsIfInvalidTradeId() external createAndFundTradeSuccessfully() {
        // ARRANGE
        uint256 invalidTradeId = 999;

        // ACT & ASSERT
        vm.prank(ARBITER);
        vm.expectRevert();
        escrow.confirmShipped(invalidTradeId, true);
    }

    function testConfirmShippedRevertsIfMsgSenderIsNotArbiter() external createAndFundTradeSuccessfully() {
        // ACT & ASSERT
        vm.prank(SUPPLIER);
        vm.expectRevert();
        escrow.confirmShipped(tradeId, true);
    }

    function testConfirmShippedRevertsIfTradeNotFunded() external createTradeSuccessfully() {
        // ACT & ASSERT
        vm.prank(ARBITER);
        vm.expectRevert();
        escrow.confirmShipped(tradeId, true);
    }

    function testConfirmShippedRevertsIfInvalidDeadline() external createAndFundTradeSuccessfully() {
        // ARRANGE
        vm.warp(block.timestamp + 2 weeks);

        // ACT & ASSERT
        vm.prank(ARBITER);
        vm.expectRevert();
        escrow.confirmShipped(tradeId, true);
    }

    function testConfirmShippedRevertsIfNotConfirmed() external createAndFundTradeSuccessfully() {
        // ACT & ASSERT
        vm.prank(ARBITER);
        vm.expectRevert();
        escrow.confirmShipped(tradeId, false);
    }

    function testMeetTradeConditionsRevertsIfInvalidTradeId() external createAndFundTradeSuccessfully() {
        // ARRANGE
        uint256 invalidTradeId = 999;

        // ACT & ASSERT
        vm.prank(ARBITER);
        vm.expectRevert();
        escrow.meetTradeConditions(invalidTradeId);
    }

    function testMeetTradeConditionsRevertsIfMsgSenderIsNotArbiter() external createAndFundTradeSuccessfully() {
        // ACT & ASSERT
        vm.prank(SUPPLIER);
        vm.expectRevert();
        escrow.meetTradeConditions(tradeId);
    }

    function testMeetTradeConditionsRevertsIfTradeNotFunded() external createTradeSuccessfully() {
        // ACT & ASSERT
        vm.prank(ARBITER);
        vm.expectRevert();
        escrow.meetTradeConditions(tradeId);
    }

    function testMeetTradeConditionsRevertsIfInvalidDeadline() external createAndFundTradeSuccessfully() {
        // ARRANGE
        vm.warp(block.timestamp + 2 weeks);

        // ACT & ASSERT
        vm.prank(ARBITER);
        vm.expectRevert();
        escrow.meetTradeConditions(tradeId);
    }

    function testMeetTradeConditionsRevertsIfNotAllConditionsMet() external createAndFundTradeSuccessfully() {
        // ACT & ASSERT
        vm.prank(ARBITER);
        vm.expectRevert();
        escrow.meetTradeConditions(tradeId);
    }

    function testConfirmDeliveryRevertsIfInvalidTradeId() external meetTradeConditionsSuccessfully() {
        // ARRANGE
        uint256 invalidTradeId = 999;

        // ACT & ASSERT
        vm.prank(ARBITER);
        vm.expectRevert();
        escrow.confirmDelivery(invalidTradeId);
    }

    function testConfirmDeliveryRevertsIfMsgSenderIsNotArbiter() external meetTradeConditionsSuccessfully() {
        // ACT & ASSERT
        vm.prank(SUPPLIER);
        vm.expectRevert();
        escrow.confirmDelivery(tradeId);
    }

    function testConfirmDeliveryRevertsIfTradeConditionsNotMet() external createAndFundTradeSuccessfully() {
        // ACT & ASSERT
        vm.prank(ARBITER);
        vm.expectRevert();
        escrow.confirmDelivery(tradeId);
    }

    /*//////////////////////////////////////////////////////////////
                            EDGE CASES TESTS
    //////////////////////////////////////////////////////////////*/
    function testRaiseAndResolveDisputeToSupplierWorks() external meetTradeConditionsSuccessfully() {
        // ARRANGE
        
        // ACT
        vm.prank(BUYER);
        escrow.raiseDispute(tradeId);
        vm.prank(ARBITER);
        escrow.resolveDispute(tradeId, true);

        // ASSERT
    }

    function testRaiseAndResolveDisputeToBuyerWorks() external meetTradeConditionsSuccessfully() {
        // ARRANGE
        
        // ACT
        vm.prank(BUYER);
        escrow.raiseDispute(tradeId);
        vm.prank(ARBITER);
        escrow.resolveDispute(tradeId, false);

        // ASSERT
    }

    function claimRefundWorks() external meetTradeConditionsSuccessfully() {
        // ARRANGE
        vm.prank(BUYER);
        escrow.raiseDispute(tradeId);
        vm.prank(ARBITER);
        escrow.resolveDispute(tradeId, false);

        // ACT
        vm.prank(BUYER);
        escrow.claimRefund(tradeId);

        // ASSERT
    }

    function testCancelTradeWorks() external createTradeSuccessfully() {
        // ARRANGE

        // ACT
        vm.prank(BUYER);
        escrow.cancelTrade(tradeId);

        // ASSERT

    }

    /*//////////////////////////////////////////////////////////////
                        EDGE CASES REVERT TESTS
    //////////////////////////////////////////////////////////////*/
    function testRaiseDisputeRevertsIfTradeNotFunded() external createTradeSuccessfully() {
        // ACT & ASSERT
        vm.prank(BUYER);
        vm.expectRevert();
        escrow.raiseDispute(tradeId);
    }

    function testResolveDisputeRevertsIfTradeNotFunded() external createTradeSuccessfully() {
        // ACT & ASSERT
        vm.prank(ARBITER);
        vm.expectRevert();
        escrow.resolveDispute(tradeId, true);
    }

    function testRaiseDisputeRevertsIfInvalidTradeId() external createAndFundTradeSuccessfully() {
        // ARRANGE
        uint256 invalidTradeId = 999;

        // ACT & ASSERT
        vm.prank(BUYER);
        vm.expectRevert();
        escrow.raiseDispute(invalidTradeId);
    }

    function testResolveDisputeRevertsIfInvalidTradeId() external createAndFundTradeSuccessfully() {
        // ARRANGE
        uint256 invalidTradeId = 999;

        // ACT & ASSERT
        vm.prank(ARBITER);
        vm.expectRevert();
        escrow.resolveDispute(invalidTradeId, true);
    }

    function testRaiseDisputeRevertsIfInvalidDeadline() external createAndFundTradeSuccessfully() {
        // ARRANGE
        vm.warp(block.timestamp + 2 weeks);

        // ACT & ASSERT
        vm.prank(BUYER);
        vm.expectRevert();
        escrow.raiseDispute(tradeId);
    }

    function testResolveDisputeRevertsIfNotArbiter() external createAndFundTradeSuccessfully() {
        // ACT & ASSERT
        vm.prank(SUPPLIER);
        vm.expectRevert();
        escrow.resolveDispute(tradeId, true);
    }


    function testClaimRefundRevertsIfNotBuyer() external meetTradeConditionsSuccessfully() {
        // ARRANGE
        vm.prank(BUYER);
        escrow.raiseDispute(tradeId);
        vm.prank(ARBITER);
        escrow.resolveDispute(tradeId, false);

        // ACT & ASSERT
        vm.prank(SUPPLIER);
        vm.expectRevert();
        escrow.claimRefund(tradeId);
    }

    function testClaimRefundRevertsIfInvalidTradeId() external meetTradeConditionsSuccessfully() {
        // ARRANGE
        vm.prank(BUYER);
        escrow.raiseDispute(tradeId);
        vm.prank(ARBITER);
        escrow.resolveDispute(tradeId, false);

        uint256 invalidTradeId = 999;

        // ACT & ASSERT
        vm.prank(BUYER);
        vm.expectRevert();
        escrow.claimRefund(invalidTradeId);
    }

    function testClaimRefundRevertsIfTradeNotFunded() external createTradeSuccessfully() {
        // ACT & ASSERT
        vm.prank(BUYER);
        vm.expectRevert();
        escrow.claimRefund(tradeId);
    }

    function testClaimRefundRevertsIfInvalidDeadline() external createAndFundTradeSuccessfully() {
        // ARRANGE
        // vm.prank(BUYER);
        // escrow.raiseDispute(tradeId);
        // vm.prank(ARBITER);
        // escrow.resolveDispute(tradeId, false);

        vm.warp(block.timestamp - 1);

        // ACT & ASSERT
        vm.prank(BUYER);
        vm.expectRevert();
        escrow.claimRefund(tradeId);
    }

    function testCancelTradeRevertsIfInvalidTradeId() external createTradeSuccessfully() {
        // ARRANGE
        uint256 invalidTradeId = 999;

        // ACT & ASSERT
        vm.prank(BUYER);
        vm.expectRevert();
        escrow.cancelTrade(invalidTradeId);
    }

    /*//////////////////////////////////////////////////////////////
                        FORK TESTS ON ARC TESTNET
    //////////////////////////////////////////////////////////////*/
    function testDeployVaultAndEscrowOnArcTestnet() external {
        // ARRANGE
        //@notice create a fork of Arc Testnet network
        arcTestnetFork = vm.createSelectFork("arc_testnet");

        // ACT
        vm.prank(OWNER);
        vault = new Vault(address(usdc), PLACEHOLDER);


        vm.prank(OWNER);
        escrow = new Escrow(address(vault));

        vm.prank(OWNER);
        vault.setEscrow(address(escrow));
        // ASSERT

    }

    function testConfirmDeliveryIsSuccessfulOnArc() external {
        // ARRANGE
        arcTestnetFork = vm.createSelectFork("arc_testnet");
        uint256 tradeAmount = 10e6;
        usdc = new ERC20Mock();

        uint256 tradeDeadline = block.timestamp + 1 weeks;
        vm.deal(BUYER, BUYER_ETH_BALANCE);
        deal(address(usdc), BUYER, BUYER_USDC_BALANCE);

        // ACT
        vm.prank(OWNER);
        vault = new Vault(address(usdc), PLACEHOLDER);


        vm.prank(OWNER);
        escrow = new Escrow(address(vault));

        vm.prank(OWNER);
        vault.setEscrow(address(escrow));
        
        vm.prank(BUYER);
        tradeId = escrow.createTrade(BUYER, SUPPLIER, tradeAmount, ARBITER, tradeDeadline);

        vm.prank(BUYER);
        IERC20(address(usdc)).forceApprove(address(vault), BUYER_USDC_BALANCE);

        vm.prank(BUYER);
        escrow.fundTrade(tradeId);

        vm.prank(ARBITER);
        escrow.confirmGoodsReceived(tradeId, true);
        vm.prank(ARBITER);
        escrow.confirmCustomsCleared(tradeId, true);
        vm.prank(ARBITER);
        escrow.confirmShipped(tradeId, true);

        vm.prank(ARBITER);
        escrow.meetTradeConditions(tradeId);
        vm.prank(ARBITER);
        escrow.confirmDelivery(tradeId);

        // ASSERT
        assertEq(usdc.balanceOf(SUPPLIER), tradeAmount);
        console2.log("Supplier has successfully recieved payment for the goods supplied to the buyer on the Arc Testnet network");
        console2.log("Supplier recieved", (tradeAmount / 1e6), "USDC, after successful delivery confirmation by the third-party arbiter.");
    }

    /*//////////////////////////////////////////////////////////////
                         FUZZ TESTS
    //////////////////////////////////////////////////////////////*/
}
