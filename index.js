
//express is the framework we're going to use to handle requests
const express = require('express')

//Create a new instance of express
const app = express()

//Access the connection to Heroku Database
const pool = require('./utilities').pool

let middleware = require('./middleware')

/*
 * This middleware function parses JASOn in the body of POST requests
 */
app.use(express.json())

/*
 * This middleware function will respond to improperly formed JSON in
 * request parameters.
 */
app.use(middleware.jsonErrorInBody)

/*
* Setup contact endpoint for user contact
*/
app.use('/contacts', middleware.checkToken, require('./routes/contacts.js'))

app.use('/resetpassword', require('./routes/emails.js'))

/*
 * Setup auth endpoint for user registration and login.
 */
app.use('/auth', require('./routes/auth.js'))

// Endpoint for all weather API calls
app.use('/weather', require('./routes/weather.js'))


// Add home page endpoint.
app.get("/", (request, response) => {
    // Home page can contain a link to the documentation
    response.status(200).send(
        '<a href="https://group1-tcss450-project.herokuapp.com/doc">API Documentation</a>'
    )
});

// Add endpoint for front end application to retrieve email verification code.
app.get('/get-verification', (request, response) => {
    response.status(200).send(
        {
            verification: process.env.EMAIL_VERIFICATION
        }
    )
})

// Add endpoints for messages, chats, and pushyregister functions
app.use('/messages', middleware.checkToken, require('./routes/messages.js'))
app.use('/chats', middleware.checkToken, require('./routes/chats.js'))
app.use('/auth', middleware.checkToken, require('./routes/pushyregister.js'))
app.use('/verification', require('./routes/verification.js'))
app.use('/chatrooms', middleware.checkToken, require('./routes/chatrooms.js'))
app.use('/chatmembers', middleware.checkToken,require('./routes/chatmembers.js'))

/*
 * Serve the API documentation generated by apidoc as HTML.
 * https://apidocjs.com/
 */
app.use("/doc", express.static('apidoc'))

/*
* Heroku will assign a port you can use via the 'PORT' environment variable
* To access an environment variable, use process.env.<ENV>
* If there isn't an environment variable, process.env.PORT will be null (or undefined)
* If a value is 'falsy', i.e. null or undefined, javascript will evaluate the rest of the 'or'
* In this case, we assign the port to be 5000 if the PORT variable isn't set
* You can consider 'let port = process.env.PORT || 5000' to be equivalent to:
* let port; = process.env.PORT;
* if(port == null) {port = 5000}
*
*/
app.listen(process.env.PORT || 5000, () => {
    console.log("Server up and running on port: " + (process.env.PORT || 5000));
});

module.exports = app;
