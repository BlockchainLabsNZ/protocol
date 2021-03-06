import * as Utils from 'web3-utils'
import BigNumber from 'bignumber.js'

import configTest from '../../config.test.json'
import {
  contractInstance,
  daiTokenInstance,
  daiTokenInstanceDeployed
} from '../../src/infura/contracts'
import {deployAll} from '../../src/infura/deploy'
import {nowSecs, toContractBigNumber} from '../../src/infura/utils'

// default market for testing
const MARKET_STR = 'Poloniex_ETH_USD'
const MARKET_ID = Utils.sha3(MARKET_STR)

const MARKET_STR_2 = 'Poloniex_BTC_USD'
const MARKET_ID_2 = Utils.sha3(MARKET_STR_2)

/**
 * Deploy a mock DAI token for test and develop.
 * @param web3 Connected Web3 instance
 * @param config Config instance (see config.<env>.json)
 * @return daiToken DAIToken truffle-contract instance
 */
const deployMockDAIToken = async (web3, config) => {
  web3.eth.defaultAccount = config.ownerAccountAddr
  const DAIToken = daiTokenInstance(web3.currentProvider, config)

  // console.log('Deploying mock DAIToken ...')
  // const daiToken = await DAIToken.new()
  const daiToken = await DAIToken.deploy({}).send({
    from: config.ownerAccountAddr,
    gas: config.gasDefault
  })
  // console.log(`DAIToken: ${daiToken.options.address}`)
  // console.log('done\n')

  return daiToken
}

/**
 * Deploy full set of contracts for testing.
 * Add 1 market and an initial price for that market.
 */
const deployAllForTest = async ({
  web3,
  config = configTest,
  firstTime = true,
  initialPrice, // push this is as feed value for test market
  seedAccounts = [] // array of accounts to seed with DAI
}) => {
  const daiToken = firstTime
    ? await deployMockDAIToken(web3, config)
    : await daiTokenInstanceDeployed(config, web3)
  const configUpdated = Object.assign({}, config, {
    daiTokenAddr: daiToken.options.address
  })

  const deployment = await deployAll(web3, configUpdated, firstTime)

  const {feeds} = deployment
  await feeds.methods.addMarket(MARKET_STR).send()
  await feeds.methods.addMarket(MARKET_STR_2).send()

  const decimals = await feeds.methods.decimals().call()
  const initialPriceBN = toContractBigNumber(initialPrice, decimals)
  await feeds.methods.push(MARKET_ID, initialPriceBN.toFixed(), nowSecs()).send({
    from: configUpdated.daemonAccountAddr
  })

  if (firstTime === true && seedAccounts.length > 0) {
    const tenDAI = new BigNumber('1e18').times(10)
    await Promise.all(
      seedAccounts.map(acc =>
        daiToken.methods.transfer(acc, tenDAI.toFixed()).send({
          from: configUpdated.ownerAccountAddr
        })
      )
    )
  }

  return Object.assign({}, deployment, {
    marketId: MARKET_ID,
    decimals
  })
}

export {deployAllForTest, deployMockDAIToken}
