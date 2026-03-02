const { MongoClient } = require('mongodb');

async function checkRepl() {
    const uri = "mongodb://127.0.0.1:27017";
    const client = new MongoClient(uri);

    try {
        console.log("Connecting to MongoDB to check Replica Set status...");
        await client.connect();
        const adminDb = client.db('admin');

        try {
            const status = await adminDb.command({ replSetGetStatus: 1 });
            console.log("Replica Set Status:", JSON.stringify(status, null, 2));
        } catch (e) {
            console.error("Error getting status:", e.message);
            if (e.message.includes('not running with --replSet')) {
                console.error("The node is NOT running in replica set mode.");
            }
        }
    } catch (err) {
        console.error("Connection Error:", err.message);
    } finally {
        await client.close();
    }
}

checkRepl();
