import BigNumber from 'bignumber.js'

BigNumber.config({DECIMAL_PLACES: 30})

/**
 * @see ContractForDifference.sol calculateCollateralAmount() for the CFD
 *      Solidity implementation.
 *
 * Formulas are:
 *     Cl = depositBalanceLong  + N * (P - S) / S
 *     Cs = depositBalanceShort - N * (P - S) / S
 */
const calculateCollateral = ({
  strikePrice,
  marketPrice,
  notionalAmount,
  depositBalance,
  calcBuyerSide
}) => {
  marketPrice = new BigNumber(marketPrice)
  depositBalance = new BigNumber(depositBalance)
  const difference = notionalAmount.times(
    marketPrice.minus(strikePrice).dividedBy(strikePrice)
  )
  return calcBuyerSide
    ? depositBalance.plus(difference)
    : depositBalance.minus(difference)
}

/**
 * @see ContractForDifference.sol cutOffPrice() for Solidity implementation.
 *
 * Base Formulas are:
 *     Buyer:  1.05 * S - depositBalanceLong  * S / N
 *     Seller: 0.95 * S + depositBalanceShort * S / N
 */
const cutOffPrice = ({
  strikePrice,
  notionalAmount,
  depositBalance,
  buyerSide
}) => {
  const strikeFivePercent = strikePrice.times(buyerSide === true ? 1.05 : 0.95)
  const difference = depositBalance.times(strikePrice).dividedBy(notionalAmount)

  // can occur when buyer has leverage less then 1X (ie. deposits > notional)
  if (buyerSide === true && strikeFivePercent.lt(difference)) {
    return new BigNumber(0)
  }

  return buyerSide === true
    ? strikeFivePercent.minus(difference)
    : strikeFivePercent.plus(difference)
}

/**
 * Fee for creator is half an update fee PLUS 0.3% of the notional.
 * @see ContractForDifference.sol creatorFee() for Solidity implementation.
 */
const creatorFee = notionalAmount => notionalAmount.times(0.003)

/**
 * Fee for joiner - via either deposit() or buy()
 * Fee is 0.5% of the notional.
 * @see ContractForDifference.sol joinerFee() for Solidity implementation.
 */
const joinerFee = notionalAmount => notionalAmount.times(0.005)

/**
 * Calculate new notional amount after a side has been sold at a new strike price.
 *
 * @see ContractForDifference.sol calculateNewNotional() for the CFD
 *      Solidity implementation.
 *
 * Formula is:
 *  N2 = N1 * S2 / S1
 * Where:
 *  N1 = previous notional
 *  S1 = previous strike price
 *  S2 = sale strike price
 *
 * @param _oldNotional Existing notional.
 * @param _oldStrikePrice Existing strike price.
 * @param _newStrikePrice New / Sale strike price.
 * @return newNotional Result of the calculation.
 *
 */
const calculateNewNotional = ({oldNotional, oldStrikePrice, newStrikePrice}) =>
  oldNotional.times(newStrikePrice.dividedBy(oldStrikePrice))

module.exports = {
  calculateCollateral,
  calculateNewNotional,
  cutOffPrice,
  creatorFee,
  joinerFee
}
