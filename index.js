const https = require('https');
'use strict';

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
		text: output,
		},
	    card: {
            type: 'Simple',
		title: 'Bible Library',
		content: 'Bible Passage',
		},
	    reprompt: {
            outputSpeech: {
                type: 'PlainText',
		    text: repromptText,
		    },
		},
	    shouldEndSession,
		};
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
	    sessionAttributes,
	    response: speechletResponse,
	    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = "Welcome to Bib Lib. Ask me for a passage to read!";
    const repromptText = 'Please retry and say for example, ' +
        'give me a passage';
    const shouldEndSession = false;
    callback(sessionAttributes,
	     buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thank you for using Bib Lib. Have a nice day!';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;
    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function getPassage(callback) {
    var url = 'https://bib-lib.herokuapp.com/bibs/passage/';
    var body = '';
    var finalPassage = '';
    https.get(url, function(res) {
	    console.log("Got response: " + res.statusCode);
	    res.on('data', function(chunk) {
		    body += chunk;
		});
	    res.on('end', function() {
		    var response = JSON.parse(body);
		    finalPassage = JSON.stringify(response.passage);
		    var respo = "You should read " + finalPassage;
		    callback({}, buildSpeechletResponse('Session Ended', respo, "Ask me for a random passage", false));
		    return response;
		});
	}).on('error', function(e) {
		console.log("Got error: " + e.message);
	    })
	}


// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'getPassage') {
        getPassage(callback);
    } else if (intentName === 'AMAZON.HelpIntent') {
        getWelcomeResponse(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback);
    } else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);
        if (event.session.application.applicationId !== 'amzn1.ask.skill.526c0bcf-2f37-4ca2-a74b-5855e1ac0e98') {
	    callback('Invalid Application ID');
        }

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
		     event.session,
		     (sessionAttributes, speechletResponse) => {
			 callback(null, buildResponse(sessionAttributes, speechletResponse));
		     });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
		     event.session,
		     (sessionAttributes, speechletResponse) => {
			 callback(null, buildResponse(sessionAttributes, speechletResponse));
		     });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
