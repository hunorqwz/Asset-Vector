"use server";

import { revalidatePath } from "next/cache";

export async function executeTrade(ticker: string, side: "buy" | "sell", notionalValue: number, currentPrice: number) {
  try {
    // Calculate fractional quantity
    const qty = (notionalValue / currentPrice).toFixed(4);

    // Simulate mock order execution
    const order = {
      id: `order_${Math.random().toString(36).substring(2, 11)}`,
      status: "filled",
      filled_qty: qty,
      filled_avg_price: currentPrice.toString()
    };
    
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
