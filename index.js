require('dotenv').config()
const lnService = require('ln-service');
const express = require('express')
const app = express()
const port = process.env.PORT || 3000
const fs = require('fs')
const path = require('path')

const pathToCert = '/home/krtk6160/.lnd/tls.cert'
const pathToMacaroon = '/home/krtk6160/.lnd/data/chain/bitcoin/testnet/admin.macaroon'

const cert = process.env.CERT || fs.readFileSync(path.resolve(pathToCert)).toString('base64')
const macaroon = process.env.MACAROON || fs.readFileSync(path.resolve(pathToMacaroon)).toString('base64')

const {lnd} = lnService.authenticatedLndGrpc({
	cert: cert,
	macaroon: macaroon,
	socket: '127.0.0.1:10009',
});

app.use(express.json())

app.get('/getFees', async (req, res) => {
	const mtokens = 1000000
	var assumedFeeChannelIds = []
	const start = (await lnService.getWalletInfo({lnd})).public_key
	const end = req.body.otherNode
	var numResult = req.body.numResult || 5
	var {channels} = await lnService.getNetworkGraph({lnd});


	// Assuming the most common fee_rate and base_fee_mtoken values for channels that do not have one
	channels.forEach((channel) => {
		channel.policies.forEach(policy => {
			if(!policy.fee_rate || !policy.base_fee_mtokens) {
				assumedFeeChannelIds.push(channel.id)
				policy.fee_rate = policy.fee_rate || 1
				policy.base_fee_mtokens = policy.base_fee_mtokens || 1000
			}
		})
	})
	
	const {paths} = lnService.calculatePaths({channels, end, start, mtokens});
	
	paths.forEach((path, pathIndex) => {
		path.hops.forEach((hop, hopIndex) => {
			let fee_msat = hop.public_key == end ? 0 : parseInt(hop.fee_rate/1000000 * mtokens) + parseInt(hop.base_fee_mtokens) 
			path.hops[hopIndex] = {
				fee_msat,
				fee: Math.round(fee_msat/1000), 
				chan_id: hop.channel,
				public_key: hop.public_key,
				fee_assumed: assumedFeeChannelIds.includes(hop.channel) ? true : false
			}
		})

		path.total_fees_msat = path.hops.reduce((sum, { fee_msat }) => sum + fee_msat, 0)
		path.total_fees = Math.round(path.total_fees_msat/1000)

		path.hops.forEach((hop, hopIndex) => {
			path.hops[hopIndex].amt_to_forward_msat = (path.hops[hopIndex-1] ? path.hops[hopIndex-1].amt_to_forward_msat - path.hops[hopIndex].fee_msat : mtokens + path.total_fees_msat - path.hops[hopIndex].fee_msat)
			path.hops[hopIndex].amt_to_forward = Math.round(path.hops[hopIndex].amt_to_forward_msat/1000)
		})
	})

	paths.length = (paths.length > numResult ? numResult : paths.length)

	res.send(JSON.stringify({'routes':paths}, null, 2) + '\n')
})

app.get('/getInfo', async (req, res) => {
	const info = await lnService.getWalletInfo({lnd})
	res.send({'data':info})
})

app.listen(port, () => console.log(`Listening on http://localhost:${port}/`))