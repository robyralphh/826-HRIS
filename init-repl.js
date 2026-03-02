const { MongoClient } = require('mongodb');

async function initReplicaSet() {
    const uri = "mongodb://127.0.0.1:27017/?directConnection=true";
    const client = new MongoClient(uri);

    try {
        console.log("Connecting to MongoDB to initialize Replica Set...");
        await client.connect();
        const adminDb = client.db('admin');

        // Check if already initialized
        try {
            const status = await adminDb.command({ replSetGetStatus: 1 });
            console.log("Replica set is already initialized. State:", status.myState);
            process.exit(0);
        } catch (e) {
            // Not initialized, proceed to initiate
        }

        const result = await adminDb.command({
            replSetInitiate: {
                _id: "rs0",
                members: [{ _id: 0, host: "localhost:27017" }]
            }
        });

        console.log("Replica Set successfully initialized!", result);
    } catch (err) {
        console.error("Error initializing replica set:", err.message);
        if (err.message.includes('not running with --replSet')) {
            console.error("\n❌ MongoDB is NOT running with replica sets enabled.");
            console.error("Please make sure you successfully restarted the MongoDB service as Administrator.");
        }
    } finally {
        await client.close();
    }
}

initReplicaSet();
