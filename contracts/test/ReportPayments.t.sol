// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ReportPayments} from "../src/ReportPayments.sol";

contract ReportPaymentsTest is Test {
    ReportPayments public reportPayments;

    address host = address(0xA11CE);
    address guest = address(0xB0B);
    address walletAnalyzed = address(0xC0FFEE);

    uint256 constant FEE = 0.0005 ether;

    function setUp() public {
        vm.prank(host);
        reportPayments = new ReportPayments(FEE);
        vm.deal(guest, 1 ether);
    }

    function test_ConstructorSetsHostAndFee() public view {
        assertEq(reportPayments.host(), host);
        assertEq(reportPayments.reportFee(), FEE);
    }

    function test_PayForReportEmitsEventAndIncrementsRequestId() public {
        vm.prank(guest);
        vm.expectEmit(true, true, false, true);
        emit ReportPayments.ReportRequested(guest, walletAnalyzed, FEE, block.timestamp, 1);
        uint256 requestId = reportPayments.payForReport{value: FEE}(walletAnalyzed);

        assertEq(requestId, 1);
        assertEq(reportPayments.requestCount(), 1);
    }

    function test_PayForReportRevertsIfFeeTooLow() public {
        vm.prank(guest);
        vm.expectRevert(abi.encodeWithSelector(ReportPayments.InsufficientFee.selector, FEE, FEE - 1));
        reportPayments.payForReport{value: FEE - 1}(walletAnalyzed);
    }

    function test_SetReportFeeOnlyHost() public {
        vm.prank(guest);
        vm.expectRevert(ReportPayments.NotHost.selector);
        reportPayments.setReportFee(1 ether);

        vm.prank(host);
        reportPayments.setReportFee(1 ether);
        assertEq(reportPayments.reportFee(), 1 ether);
    }

    function test_WithdrawOnlyHost() public {
        vm.prank(guest);
        reportPayments.payForReport{value: FEE}(walletAnalyzed);

        vm.prank(guest);
        vm.expectRevert(ReportPayments.NotHost.selector);
        reportPayments.withdraw();

        uint256 hostBalanceBefore = host.balance;
        vm.prank(host);
        reportPayments.withdraw();
        assertEq(host.balance, hostBalanceBefore + FEE);
        assertEq(address(reportPayments).balance, 0);
    }

    function test_MultipleRequestsIncrementIds() public {
        vm.startPrank(guest);
        uint256 id1 = reportPayments.payForReport{value: FEE}(walletAnalyzed);
        uint256 id2 = reportPayments.payForReport{value: FEE}(address(0xDEAD));
        vm.stopPrank();

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(reportPayments.requestCount(), 2);
    }
}
