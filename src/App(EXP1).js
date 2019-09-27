const Iota = require('@iota/core');
const iota = Iota.composeAPI({
provider: 'https://nodes.devnet.iota.org:443'
});
const JsonReader = require('./JsonReader.js');
const jsonReader = new JsonReader();
const AgentGenerator = require('./AgentGenerator.js');
const agentGenerator = new AgentGenerator();
const PairGenerator = require('./PairGenerator.js');
const pairGenerator = new PairGenerator();
const TimeRecorder = require('./TimeRecorder.js');
const timeRecorder = new TimeRecorder();
const Configuration = require('./Configuration.js');
const config = new Configuration();

const fs = require('fs');

// Record the starting time
var startTime = new Date();
console.log(startTime);

pairGenerator.readAgents();
pairGenerator.getTradingPairs();

// Record the number of transactions to be processed
jsonReader.jsonReader('./data/transaction/group' + config.AGENTLIST_INDEX + '/transaction_data.json', (err, transaction_data) => {
   if (err) {
      console.log('Error reading file:',err)
      return
   }
   transaction_data.number_of_transactions = pairGenerator.tradingPairs.size;
   fs.writeFile('./data/transaction/group' + config.AGENTLIST_INDEX + '/transaction_data.json', JSON.stringify(transaction_data), (err) => {
      if (err) console.log('Error writing file:', err)
   })
})

// The main method constructs transaction bundles, send the transactions to the ledgers
// and records the time it takes for each transaction to be confirmed
const main = async () => {

   var transaction_time = [];
   attachedTimeList = new Map();

   for (var [key, value] of pairGenerator.tradingPairs.entries()) {
   // Loops through all the transaction pairs
   try{
      // Construct transaction bundle
      const transfers = [
      {
         value: 0,
         address: value,
      }
      ]
      var temp_hash;
      // Set delay for sending transactions
      var secondsDelayed = (Math.random() * (1.5 - 1.3) + 1.3).toFixed(2);
      let promise = new Promise((res, rej) => {
              setTimeout(() => res("Now it's done!"), secondsDelayed * 1000)
          });
      let result = await promise;
      // Convert the bundle into trytes
      const trytes = await iota.prepareTransfers(value, transfers).catch(error => {
          console.log('Error Preparing Transfers', error);
          getStatus([temp_hash]);
      })
      // Send the trytes to the node
      const response = await iota.sendTrytes(trytes, 3, 9).catch(error => {
          console.log('Error Sending Trytes', error);
          getStatus([temp_hash]);
      })
      // Return the hash of the sent transaction budnle,
      // which could be used to check its confirmation status
      response.map(tx => (temp_hash = tx.hash));
      console.log(temp_hash);
      console.log('Completed');
      // Record the time the transaction is attached to the ledger,
      // which could be used to calculate the confirmation time
      var timeAttached = new Date();
      timeAttached /= 1000;
      attachedTimeList.set(temp_hash, timeAttached);
      // Record the whole transaction infomation of each transaction
      jsonString = fs.readFileSync('./data/transaction/group' + config.AGENTLIST_INDEX + '/transactions.json');
      jsonString = jsonString + JSON.stringify(response);
      fs.writeFile('./data/transaction/group' + config.AGENTLIST_INDEX + '/transactions.json', jsonString, err => {
      if (err) {
         console.log('Error writing file', err)
      } else {
         console.log('Successfully wrote file')
      }
      })

      // get Status method
      function getStatus([temp_hash]){
         iota.getLatestInclusion([temp_hash])
            .then(states => {
            // Check that none of the transactions have been confirmed
            if (states[0] == true) {
               // Get latest tail hash
               console.log("it is confirmed.");
               // Calculate and record the Confirmation Time
               var timeConfirmed = new Date();
               timeConfirmed /= 1000;
               timeDiff = timeConfirmed - attachedTimeList.get(temp_hash);
               var seconds = Math.round(timeDiff);
               console.log(seconds);
               transaction_time.push(seconds);
               // Write the confirmation time and number of confirmed transactions to the file
               // which will be used to calculate the average confirmation time
               jsonReader.jsonReader('./data/transaction/group' + config.AGENTLIST_INDEX + '/transaction_data.json', (err, transaction_data) => {
                  if (err) {
                   console.log('Error reading file:',err)
                   return
                  }
                  transaction_data.transaction_time = transaction_time.reduce((a, b) => a + b);
                  transaction_data.number_of_confirmed_orders = transaction_time.length;
                  fs.writeFile('./data/transaction/group' + config.AGENTLIST_INDEX + '/transaction_data.json', JSON.stringify(transaction_data), (err) => {
                     if (err) console.log('Error writing file:', err)
                  })
               })
               // Delete
               var currentTime = new Date();
               console.log(currentTime);
               return;
            } else {
               // if the transaction is not confirmed yet, keep checking until it is
               getStatus([temp_hash]);
            }
      }).catch(error => {
            getStatus([temp_hash]);
         })
      }

      getStatus([temp_hash]);

      } catch (e) {
         console.log('Error Sending', e);
      }
   }
}

main();
