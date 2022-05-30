import dbo from './dbconfig.js'

export default class DbService {
    async getAllDocs() {
        return new Promise((resolve, reject) => {
            dbo().then((dbConnect) => {
                dbConnect.collection("terms").find({}).toArray(function (err, result) {
                    if (err) {
                        reject("Error fetching listings!");
                    } else {
                        resolve(result);
                    }
                });
            });
        })
    }
}