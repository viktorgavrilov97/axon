import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/lib/db";
import { syncDepositStatusFromProvider } from "@/modules/wallet/lib/wallet-service";
import { getRequiredConfirmations } from "@/modules/wallet/lib/confirmation-utils";
import { syncWithdrawalPayoutStatus } from "@/modules/wallet/lib/withdrawal-payout-service";
import { verifyWebhookSignature } from "@/modules/wallet/lib/oxapay";
import { emitRealtimeEvent } from "@/shared/lib/realtime-events";

/**
 * GET handler - для тестирования и информации
 * Webhook принимает только POST запросы от OxaPay
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: "OxaPay Webhook Endpoint",
      description: "This endpoint accepts only POST requests from OxaPay",
      method: "POST",
      url: "/api/oxapay/webhook",
      status: "active",
    },
    { status: 200 }
  );
}

/**
 * POST handler - основной обработчик webhook от OxaPay
 */
export async function POST(request: NextRequest) {
  // Declare variables outside try block for use in catch
  let body: any = null;
  let isPayout = false;
  const startedAt = Date.now();
  
  try {
    // Log raw request for debugging
    const rawBody = await request.text();
    console.log("📥 OxaPay webhook received (raw):", rawBody);

    // Parse body first to determine webhook type
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("Failed to parse webhook body as JSON:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400 }
      );
    }

    // Determine if this is a payout or deposit webhook based on type field
    isPayout = body.type === "payout";
    const isDeposit = body.type === "invoice" || body.type === "white_label" || body.type === "static_address" || body.type === "payment_link" || body.type === "donation";
    
    // Verify HMAC signature (OxaPay uses "HMAC" header, not "x-signature")
    const signature = request.headers.get("HMAC") || request.headers.get("hmac");
    if (!signature) {
      console.error("❌ OxaPay webhook missing HMAC signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const isValid = verifyWebhookSignature(rawBody, signature, isPayout);
    if (!isValid) {
      console.error("❌ Invalid webhook signature from OxaPay");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }
    console.log("✅ Webhook signature verified");

    // Idempotency check: prevent duplicate webhook processing
    const externalId = body.track_id; // OxaPay uses track_id as external identifier
    const webhookType = isPayout ? "payout" : "deposit";
    
    if (externalId) {
      // Upsert log first to avoid race conditions on duplicate callbacks
      const existingLog = await db.webhookLog.upsert({
        where: {
          externalId_webhookType_provider: {
            externalId: String(externalId),
            webhookType,
            provider: "OXAPAY",
          },
        },
        create: {
          externalId: String(externalId),
          webhookType,
          provider: "OXAPAY",
          payload: body as any,
          processed: false,
        },
        update: {
          payload: body as any,
        },
      });

      // If webhook was already processed, skip it
      if (existingLog?.processed) {
        console.log(`✅ Webhook already processed: ${externalId} (${webhookType}), skipping`);
        return NextResponse.json({ 
          ok: true, 
          type: webhookType,
          message: "Already processed" 
        });
      }

      if (!existingLog.processed) {
        console.log(`ℹ️ Processing webhook ${externalId} (${webhookType})`);
      }
    }

    console.log("📥 OxaPay webhook received (parsed):", JSON.stringify(body, null, 2));

    console.log("📥 OxaPay webhook type detected:", { isPayout, isDeposit, type: body.type });

    // Handle Payout Webhook
    if (isPayout) {
      const payoutId = body.track_id; // OxaPay uses track_id for both payments and payouts
      const payoutStatus = body.status; // "Confirming", "Confirmed", "Failed"

      console.log("📥 Payout webhook extracted:", { payoutId, payoutStatus });

      if (!payoutId) {
        console.error("Payout webhook missing payoutId:", body);
        return NextResponse.json(
          { error: "Missing payoutId" },
          { status: 400 }
        );
      }

      // Find withdrawal by providerPayoutId
      const withdrawal = await db.$queryRaw<Array<{
        id: string;
        walletId: string;
        amount: any;
        currency: string;
        toAddress: string;
        status: string;
        provider: string;
        providerPayoutId: string | null;
      }>>`
        SELECT * FROM "Withdrawal" 
        WHERE "providerPayoutId" = ${payoutId} 
        AND "provider" = 'OXAPAY'
        LIMIT 1
      `.then(results => results[0] ? {
        id: results[0].id,
        walletId: results[0].walletId,
        amount: results[0].amount,
        currency: results[0].currency,
        toAddress: results[0].toAddress,
        status: results[0].status as any,
        provider: results[0].provider as any,
        providerPayoutId: results[0].providerPayoutId,
      } : null);

      if (!withdrawal) {
        console.error("Withdrawal not found for payout webhook:", { payoutId, body });
        return NextResponse.json(
          { error: "Withdrawal not found" },
          { status: 404 }
        );
      }

      // Sync withdrawal payout status
      const result = await syncWithdrawalPayoutStatus(withdrawal.id);

      // Mark webhook as processed
      if (externalId) {
        await db.webhookLog.update({
          where: {
            externalId_webhookType_provider: {
              externalId: String(externalId),
              webhookType: "payout",
              provider: "OXAPAY",
            },
          },
          data: {
            processed: true,
            processedAt: new Date(),
            error: null,
          },
        });
      }

      console.log(
        `✅ Payout webhook processed for withdrawal ${withdrawal.id}: ` +
        `status=${result.status}, balanceDeducted=${result.balanceDeducted}`
      );

      return NextResponse.json({ ok: true, type: "payout", durationMs: Date.now() - startedAt });
    }

    // Handle Deposit Webhook
    const invoiceId = body.track_id; // OxaPay uses track_id
    const orderId = body.order_id;
    const status = body.status; // "paying", "paid", "expired", "failed"
    // Check for transaction hash in txs array (OxaPay may send transactions array)
    const txHash = body.txs?.[0]?.tx_hash || body.tx_hash || body.txHash;
    
    // Extract confirmations from webhook if available
    const txs = body.txs || [];
    const tx = txs[0];
    const confirmations = tx?.confirmations ?? null;
    const txStatus = tx?.status ?? null;
    let requiredConfirmations: number | null = null;
    
    // Determine required confirmations based on network if confirmations are present
    if (confirmations !== null && tx) {
      const txNetwork = tx.network?.toLowerCase() || "";
      requiredConfirmations = getRequiredConfirmations(txNetwork);
    }

    console.log("📥 Deposit webhook extracted:", { 
      invoiceId, 
      orderId, 
      status, 
      txHash,
      txs: body.txs,
      confirmations,
      requiredConfirmations,
      txStatus,
      type: body.type 
    });

    if (!invoiceId && !orderId) {
      console.error("Deposit webhook missing invoiceId and orderId:", body);
      return NextResponse.json(
        { error: "Missing invoiceId or orderId" },
        { status: 400 }
      );
    }

    // Try to find deposit by providerPaymentId first, then by orderId pattern
    let deposit = null;
    if (invoiceId) {
      deposit = await db.deposit.findFirst({
        where: { providerPaymentId: String(invoiceId) },
      });
    }

    // If not found by invoiceId, try to find by orderId pattern (deposit_${userId}_${timestamp})
    if (!deposit && orderId) {
      const orderIdMatch = orderId.match(/^deposit_(.+?)_(\d+)$/);
      if (orderIdMatch) {
        const userId = orderIdMatch[1];
        const wallet = await db.wallet.findUnique({
          where: { userId },
        });
        if (wallet) {
          deposit = await db.deposit.findFirst({
            where: {
              walletId: wallet.id,
              status: {
                in: ["PENDING", "PROCESSING"],
              },
            },
            orderBy: { createdAt: "desc" },
          });
        }
      }
    }

    if (!deposit) {
      console.error("Deposit not found for OxaPay webhook:", { invoiceId, orderId, body });
      return NextResponse.json(
        { error: "Deposit not found" },
        { status: 404 }
      );
    }

    // Sync deposit status from provider
    const result = await syncDepositStatusFromProvider(deposit.id);

    // If webhook contains confirmations info, emit realtime event with confirmations
    // This allows UI to update without polling when confirmations change
    if (confirmations !== null || txStatus) {
      try {
        // Get user info for realtime event
        const depositWithUser = await db.deposit.findUnique({
          where: { id: deposit.id },
          include: {
            user: {
              select: { id: true },
            },
          },
        });

        if (depositWithUser) {
          await Promise.all([
            emitRealtimeEvent({
              type: "deposit_status_updated",
              userId: depositWithUser.user.id,
              depositId: deposit.id,
              status: result.deposit.status,
              confirmations: confirmations ?? undefined,
              requiredConfirmations: requiredConfirmations ?? undefined,
              txStatus: txStatus ?? undefined,
              timestamp: new Date().toISOString(),
            }),
          ]);
        }
      } catch (error) {
        console.error("[Realtime] Failed to emit deposit change with confirmations:", error);
      }
    }

    // Mark webhook as processed
    if (externalId) {
      await db.webhookLog.update({
        where: {
          externalId_webhookType_provider: {
            externalId: String(externalId),
            webhookType: "deposit",
            provider: "OXAPAY",
          },
        },
        data: {
          processed: true,
          processedAt: new Date(),
          error: null,
        },
      });
    }

    console.log(
      `✅ OxaPay webhook processed for deposit ${deposit.id}: status=${result.deposit.status}, balanceCredited=${result.balanceCredited}, confirmations=${confirmations}/${requiredConfirmations}`
    );

    return NextResponse.json({ ok: true, type: "deposit", durationMs: Date.now() - startedAt });
  } catch (error) {
    console.error("OxaPay webhook error:", error);
    
    // Mark webhook as failed if we have externalId
    if (body?.track_id) {
      try {
        await db.webhookLog.updateMany({
          where: {
            externalId: String(body.track_id),
            webhookType: isPayout ? "payout" : "deposit",
            provider: "OXAPAY",
          },
          data: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      } catch (logError) {
        console.error("Failed to log webhook error:", logError);
      }
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

