use anchor_lang::prelude::*;

// Define the program's instruction handlers.

#[program]
mod moet_twap {
    use super::*;

    const ONE_MINUTE: i64 = 1;
    const ONE_HOUR: i64 = 60 * ONE_MINUTE;

    pub fn create(_ctx: Context<NewPrice>) -> ProgramResult {
        Ok(())
    }

    pub fn update(ctx: Context<UpdatePrice>) -> ProgramResult {
        let price_oracle = &ctx.accounts.price_account;
        let price_info = &mut ctx.accounts.price_info;

        // Here it is better to make pyth_client checks but I skipped them here
        // for the sake of simplicity.

        let now = ctx.accounts.clock.unix_timestamp;
        let diff = now - price_info.prices.last().map(|p| p.timestamp).unwrap_or(0);
        if diff >= ONE_MINUTE {
            let pyth_price_data = price_oracle.try_borrow_data()?;
            let price_data = pyth_client::cast::<pyth_client::Price>(*pyth_price_data);
            let older_than_one_hour = |timestamp: i64| now - timestamp > ONE_HOUR;
            // Remove entries older than 1 hour
            price_info.prices = price_info
                .prices
                .iter()
                .cloned()
                .skip_while(|price| older_than_one_hour(price.timestamp))
                .collect();
            // Add new price to the list
            price_info.prices.push(Price {
                value: price_data.agg.price,
                timestamp: now,
            });
            // Calculate twap
            price_info.twap = price_info
                .prices
                .iter()
                .map(|price| price.value)
                .sum::<i64>()
                / price_info.prices.len() as i64;
            msg!("price = {}", price_data.agg.price);
            msg!("twap = {}", price_info.twap);
        }
        Ok(())
    }
}

// Define the validated accounts for each handler.

#[derive(Accounts)]
pub struct NewPrice<'info> {
    #[account(init)]
    pub price_info: ProgramAccount<'info, PriceInfo>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdatePrice<'info> {
    #[account(mut)]
    pub price_info: ProgramAccount<'info, PriceInfo>,
    pub price_account: AccountInfo<'info>,
    pub clock: Sysvar<'info, Clock>,
}

// Define the program owned accounts.

#[account]
pub struct PriceInfo {
    pub twap: i64,
    pub prices: Vec<Price>,
}

#[derive(Default, Clone, Copy, Debug, AnchorSerialize, AnchorDeserialize)]
pub struct Price {
    value: i64,
    timestamp: i64,
}
