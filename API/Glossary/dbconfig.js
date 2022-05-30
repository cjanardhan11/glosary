import { MongoClient } from 'mongodb'
const connectionString = "mongodb+srv://glossary:node1234@glossary.y8d2t.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

let dbConnection;

export default function dbo () {
    return new Promise((resolve)=>{
        client.connect(function (err, db) {
            if (err || !db) {
                console.log("failed to connect MongoDB.");
            }
    
            dbConnection = db.db("glossary");
            console.log("Successfully connected to MongoDB.");
    
            resolve(dbConnection);
        })
    })
   
}