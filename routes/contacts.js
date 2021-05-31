//express is the framework we're going to use to handle requests
const express = require('express')
// //Access the connection to Heroku Database
const pool = require('../utilities').pool

const request_functions = require('../utilities/exports').requesting
var router = express.Router()

/**
 * @api {post} /contacts/create Post to create the new contacts 
 * @apiName PostContacts
 * @apiGroup Contacts
 * 
 * @apiDescription Create the new contacts by sending specific memberid selection from the search list.
 * 
 * @apiSuccess {boolean} success "true"
 * @apiSuccess {String} message "New Contact was created"
 * 
 * @apiError (400: SQL ERROR) {String} message "Missing required information"
 * @apiError (400: SQL ERROR) {String} message "Malformed parameter"
 * @apiError (400: SQL ERROR) {String} message "SQL Error with detail error info"
 * @apiError (404: User Not found) {String} message "User is not existing"
 * @apiError (404: Existing Contacts) {String} message "Contact is already existing"
 * 
 * 
 * @apiUse JSONError
 */
 router.post('/create', (request, response, next) => {
    if (!request.body.memberid) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else if (isNaN(request.body.memberid)) {
        response.status(400).send({
            message: "Malformed parameter"
        })
    } else {
        next()
    }
},(request, response, next) => {
    let query = `SELECT MemberID, FirstName, LastName,Username,Email FROM Members WHERE MemberID=$1`
    let values = [request.body.memberid]
    pool.query(query, values)
        .then(result => {
            if (result.rowCount > 0) {
                next()
            }else {
                response.status(404).send({
                    message: "User is not existing"
                })
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
}, (request, response, next) => { 
    let query = `SELECT MemberID_A, MemberID_B FROM Contacts WHERE MemberID_A=$1 AND MemberID_B=$2`
    let values = [request.decoded.memberid, request.body.memberid]

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                next()
            }else {
                response.status(404).send({
                    message: "Contact is already existing"
                })
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
}, (request, response, next) => {
    let query = `SELECT MemberID_A, MemberID_B FROM Contacts WHERE MemberID_A=$2 AND MemberID_B=$1`
    let values = [request.decoded.memberid, request.body.memberid]
    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                next()
            }else {
                response.status(404).send({
                    message: "Contact is already existing"
                })
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
}, (request, response, next) => {
    let query = 'INSERT INTO Contacts (MemberID_A, MemberID_B, Verified) VALUES ($1, $2, 1)'
    let query2 = 'INSERT INTO Contacts (MemberID_A, MemberID_B, Verified) VALUES ($2, $1, 0)'
    let values = [request.decoded.memberid, request.body.memberid]
    pool.query(query, values).then(
        pool.query(query2, values).then(result=>{
            response.success = true,
            response.message = "New Contact Request",  
            next()
        })
    ).catch (error => {
        response.status(400).send({
            message: "SQL Error",
            error: error
        })
    })
}, (request, response) => {
        let query = `SELECT token FROM Push_Token WHERE Push_Token.memberid=$1`        
        let values = [request.body.memberid]
        pool.query(query, values)
            .then(result => {
                console.log(request.decoded.memberid)
                console.log(request.body.memberid)
                console.log(request.decoded.email)
                result.rows.forEach(entry => 
                    request_functions.sendRequestToIndividual(
                        entry.token,
                        request.decoded.email,
                        request.decoded.memberid,
                        request.body.memberid
                        )
                        )
                response.send({
                    success:true
                })
            }).catch(err => {
                response.status(400).send({
                    message: "SQL Error on select from push token",
                    error: err
                })
            })
})

/**
 * @api {get} /contacts Get friend contact list which was verified by user 
 * @apiName GetFriendContacts
 * @apiGroup Contacts
 * 
 * @apiDescription Request to get friends contact list from database 
 * 
 * @apiSuccess {Object[]} friend contacts List which includes email, firstname, lastname, username, memberid, and verified
 * 
 * 
 * @apiError (400: SQL ERROR) {String} message "Missing required information"
 * @apiError (400: SQL ERROR) {String} message "Malformed parameter"
 * @apiError (404: No contacts list) {String} message "No contacts were found"
 * @apiError (404: No verified contacts list) {String} message "No verified contact lists"
 * 
 * @apiUse JSONError
 */
router.get("/", (request, response, next) => {
    if (!request.decoded.memberid) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else if (isNaN(request.decoded.memberid)) {
        response.status(400).send({
            message: "Malformed parameter"
        })
    } else {
        next()
    }
}, (request, response) => {
//    let query = 'SELECT Members.FirstName, Members.LastName, Members.email, Members.Username, MemberID_A, Verified FROM Contacts INNER JOIN Members ON Contacts.MemberID_A = Members.MemberID where Contacts.MemberID_B = $1'//and Contacts.Verified=1
//let query = 'SELECT Members.email, Members.FirstName, Members.LastName, Members.Username, Members.MemberID, Verified FROM Contacts JOIN Members ON Contacts.MemberID_B = Members.MemberID where Contacts.MemberID_A = $1 and Verified IN (SELECT Verified from Contacts where MemberID_B = $1)'
let query = 'SELECT Members.email, Members.FirstName, Members.LastName, Members.Username, Members.MemberID, Verified FROM Contacts JOIN Members ON Contacts.MemberID_B = Members.MemberID where Contacts.MemberID_A = $1 and Contacts.MemberID_B IN (SELECT MemberID_A from Contacts where MemberID_B = $1 and Verified=1)'
    let values = [request.decoded.memberid]
    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "No verified contact lists"
                })
            } else {
                let friendList = [];
                result.rows.forEach(entry =>
                    friendList.push(
                        {
                            "email": entry.email,
                            "firstName": entry.firstname,
                            "lastName": entry.lastname,
                            "userName": entry.username,
                            "memberId": entry.memberid,
                            "verified": entry.verified
                        }
                    )
                )
                response.send({
                    success: true,
                    contacts: friendList
                })
            }
        }).catch(error => {
            response.status(400).send({
                message: "Missing required information",
                error: error
            })
        })
});


/**
 * @api {get} /contacts/search Get search contact list who doesn't in user's contact(friend) list 
 * @apiName GetSearchContacts
 * @apiGroup Contacts
 * 
 * @apiDescription search the new contacts who doesn't in friend list
 * 
 * @apiSuccess {Object[]} contacts List who doesn't in friend list and it includes email, firstname, lastname, username, and memberid info
 * 
 * 
 * @apiError (400: SQL ERROR) {String} message "Missing required information"
 * @apiError (400: SQL ERROR) {String} message "Malformed parameter"
 * @apiError (404: Contacts Not Found) {String} message "No search contacts were found"
 * 
 * @apiUse JSONError
 */
 router.get("/search", (request, response, next) => {
    if (!request.decoded.memberid) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else if (isNaN(request.decoded.memberid)) {
        response.status(400).send({
            message: "Malformed parameter"
        })
    } else {
        next()
    }
}, (request, response) => { 
    let query = 'SELECT Members.email, Members.FirstName, Members.LastName,  Members.Username, Members.MemberID FROM Members WHERE Members.MemberID NOT IN (SELECT MemberID_B FROM Contacts WHERE MemberID_A = $1)'
    let values = [request.decoded.memberid]
    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "No search contacts were found"
                })
            } else {
                let listContacts = [];
                result.rows.forEach(entry =>
                    listContacts.push(
                        {
                            "email": entry.email,
                            "firstName": entry.firstname,
                            "lastName": entry.lastname,
                            "userName": entry.username,
                            "memberId": entry.memberid
                        }
                    )
                )
                response.send({
                    success: true,
                    contacts: listContacts
                })
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
});


/**
 * @api {Delete} /contacts/delete Delete the existing contact list 
 * @apiName DeleteContacts
 * @apiGroup Contacts
 * 
 * @apiDescription Delete the existing contacts from contact list.
 * 
 * @apiSuccess {boolean} success "true"
 * @apiSuccess {String} message "Contact was deleted"
 * 
 * @apiError (400: SQL ERROR) {String} message "Missing required information"
 * @apiError (400: SQL ERROR) {String} message "Malformed parameter"
 * @apiError (400: SQL ERROR) {String} message "SQL Error, and detail error info"
 * @apiError (404: No User Found) {String} message "User is not existing"
 * @apiError (404: No Contact Found) {String} message "Contact is not existing"
 * 
 * 
 * @apiUse JSONError
 */
 router.delete("/delete/:memberid?", (request, response, next) => {
    if (!request.params.memberid) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else if (isNaN(request.params.memberid)) {
        response.status(400).send({
            message: "Malformed parameter"
        })
    }else {
        next()
    }
},(request, response, next) => {
    let query = `SELECT MemberID, FirstName, LastName,Username,Email FROM Members WHERE MemberID=$1`
    let values = [request.params.memberid]
    pool.query(query, values)
        .then(result => {
            if (result.rowCount > 0) {
                next()
            }else {
                response.status(404).send({
                    message: "User is not existing"
                })
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
}, (request, response, next) => { 
    let query = `SELECT MemberID_A, MemberID_B FROM Contacts WHERE MemberID_A=$1 AND MemberID_B=$2`
    let values = [request.decoded.memberid, request.params.memberid]

    pool.query(query, values)
        .then(result => {
            if (result.rowCount > 0) {
                next()
            }else {
                response.status(404).send({
                    message: "Contact is not existing"
                })
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
}, (request, response, next) => {
    let query = `SELECT MemberID_A, MemberID_B FROM Contacts WHERE MemberID_A=$2 AND MemberID_B=$1`
    let values = [request.decoded.memberid, request.params.memberid]
    pool.query(query, values)
        .then(result => {
            if (result.rowCount > 0) {
                next()
            }else {
                response.status(404).send({
                    message: "Contact is not existing"
                })
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
}, (request, response) => { 
    let query = 'DELETE FROM Contacts WHERE MemberID_A = $2 AND MemberID_B = $1'
    let query2 = 'DELETE FROM Contacts WHERE MemberID_B =  $2 AND MemberID_A = $1'
    let values = [request.decoded.memberid, request.params.memberid]
    
    pool.query(query, values).then(
        pool.query(query2, values),
        response.send({
            success: true,
            message: "Contact was deleted"
        })
    ).catch (error => {
        response.status(400).send({
            message: "Contacts were not found",
            error: error
        })
    })
})

/**
 * @api {Get} /request friend request list
 * @apiName getFriendRequest
 * @apiGroup Contacts
 */
router.get("/request", (request, response, next) => {
    if (!request.decoded.memberid) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else if (isNaN(request.decoded.memberid)) {
        response.status(400).send({
            message: "Malformed parameter"
        })
    } else {
        next()
    }
}, (request, response) => {
    //Get contact info
    let query = 'SELECT Members.email, Members.FirstName, Members.LastName, Members.Username, Members.MemberID, Contacts.Verified FROM Contacts JOIN Members ON Contacts.MemberID_B = Members.MemberID where Contacts.MemberID_A = $1 and Contacts.Verified=0'
    let values = [request.decoded.memberid]
    console.log(request.decoded.memberid);
    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "No request"
                })
            } else {
                let listRequest = [];
                result.rows.forEach(entry => {
                        listRequest.push(
                        {
                            "email": entry.email,
                            "firstName": entry.firstname,
                            "lastName": entry.lastname,
                            "userName": entry.username,
                            "memberId": entry.memberid,
                            "verified": entry.verified
                        })
                })
                response.send({
                    success: true,
                    request: listRequest
                })
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
});


/**
 * @api {post} /accept Accept friend request
 * @apiName acceptFriendRequest
 * @apiGroup Contacts
 */
 router.post("/accept", (request, response, next) => {
    if (!request.body.memberId) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else if (isNaN(request.body.memberId)) {
        response.status(400).send({
            message: "Malformed parameter"
        })
    } else {
        next()
    }
}, (request, response) => {
    let query = 'UPDATE Contacts SET Verified = 1 WHERE MemberID_A = $1 AND MemberID_B = $2'
    let query2 = 'UPDATE Contacts SET Verified = 1 WHERE MemberID_B = $1 AND MemberID_A = $2'
    let values = [request.decoded.memberid, request.body.memberId]

    pool.query(query, values).then(result => {
        pool.query(query2, values)
        response.send({
            success: true,
            message: "Request was accepted"
        })
    }).catch(error => {
        response.status(400).send({
            message: "SQL Error",
            error: error
        })
    })
})







module.exports = router
