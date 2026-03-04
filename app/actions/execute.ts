"use server";

import { placeAlpacaOrder, getAlpacaAccount, getAlpacaPositions } from "@/lib/alpaca-client";
import { revalidatePath } from "next/cache";

export async function executeTrade(ticker: string, side: "buy" | "sell", notionalValue: number, currentPrice: number) {
  try {
    // Basic risk check: ensure we have buying power
    const account = await getAlpacaAccount();
    if (side === "buy" && Number(account.buying_power) < notionalValue) {
      return { success: false, error: "Insufficient Buying Power" };
    }

    // Calculate fractional quantity
    const qty = (notionalValue / currentPrice).toFixed(4);

    // Institutional execution to market
    const order = await placeAlpacaOrder(ticker, qty, side, "market") as any;
    
    // Invalidate cache if portfolio page exists
    revalidatePath("/portfolio");

    return { 
      success: true, 
      orderId: order.id, 
      status: order.status, 
      filledQty: order.filled_qty,
      filledAvgPrice: order.filled_avg_price 
    };
  } catch (error: any) {
    console.error(`[Execution Engine] Order Failed for ${ticker}:`, error);
    return { success: false, error: error.message };
  }
}
