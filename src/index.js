// 1. Text strings =====================================================================================================
//    Modify these strings and messages to change the behavior of your Lambda function

var languageStrings = {
  'en': {
    'translation': {
      'WELCOME': "Welcome Sushi Central",
      'TITLE': "Sushi",
      'HELP': "Main menu. You can say, make sushi, mail sushi to my friends, and find nearest sushi place",
      'STOP': "Sayonara"
    }
  }
  // , 'de-DE': { 'translation' : { 'WELCOME'   : "Guten Tag etc." } }
};
var data = {
  // TODO: Replace this data with your own.
  "ingredients": [{
      "name": "bread",
      "qty": 2,
      "units": "pieces of"
    },
    {
      "name": "egg",
      "qty": 1,
      "units": ""
    },
    {
      "name": "cheese",
      "qty": 1,
      "units": "slice of"
    }
  ],
  "steps": [
    "Visit Japan. Convert your race to Japanese.",
    "Never speak English. Japanese only. ",
    "Get rice.",
    "Get fish.",
    "Put fish and rice together.",
    "You now have the best sushi in the world",
    "Serve."
  ],
  "locations": [{
    "name": "Mio Sushi",
    "location": "Portland, Oregon"
  }]
};

var welcomeCardImg = {
  smallImageUrl: 'https://img.grouponcdn.com/deal/vp9PocZkrsK7BA3v49kDwRpc5XB/vp-700x420/v1/c700x420.jpg',
  largeImageUrl: 'https://img.grouponcdn.com/deal/vp9PocZkrsK7BA3v49kDwRpc5XB/vp-700x420/v1/c700x420.jpg'
};
// 2. Skill Code =======================================================================================================

var Alexa = require('alexa-sdk');

var AWS = require('aws-sdk'); // this is defined to enable a DynamoDB connection from local testing
var AWSregion = 'us-east-1'; // eu-west-1
AWS.config.update({
  region: AWSregion
});

exports.handler = function(event, context, callback) {
  var alexa = Alexa.handler(event, context);

  alexa.appId = 'amzn1.ask.skill.9adccfe9-f1bd-4a15-afb3-f2a9e625f3f3';
  alexa.dynamoDBTableName = 'RecipeSkillTable'; // creates new table for session.attributes

  alexa.resources = languageStrings;
  alexa.registerHandlers(handlers);
  alexa.execute();

};

var handlers = {
  'LaunchRequest': function() {
    if (!this.attributes['currentStep']) {

      var say = this.t('WELCOME') + ' ' + this.t('HELP');
      this.emit(':askWithCard', say, say, this.t('TITLE'), this.t('WELCOME'), welcomeCardImg);

    } else {

      var say = 'Welcome back.  You were on step ' +
        this.attributes['currentStep'] +
        '. Say restart if you want to start over. ' +
        ' Ready to continue with step ' +
        (parseInt(this.attributes['currentStep']) + 1).toString() + '?';
      this.emit(':askWithCard', say, say, 'Continue?', say);
    }

  },

  'FindSushiIntent': function() {
    var say = 'The nearest ';
  },

  'MainIntent': function() {
    var say = 'Main menu. You can say, make sushi, mail sushi to my friends, and find nearest sushi place';
    this.emit(":tell", say);
  },

  'MailIntent': function() {
    var say = 'Who you like to mail your sushi to?';
    this.emit(':tell', say);
  },

  'IngredientsIntent': function() {

    var say = "";
    var list = [];
    for (var i = 0; i < data.ingredients.length; i++) {
      var item = data.ingredients[i];
      list.push(item.qty + ' ' + item.units + ' ' + item.name);
    }
    say += sayArray(list, 'and');
    say = 'The ingredients you will need are, ' + say + '. Are you ready to cook? ';

    var cardlist = list.toString().replace(/\,/g, '\n');

    this.emit(':askWithCard', say, 'Say yes if you are ready to begin cooking the recipe.', this.t('TITLE') + ' shopping list', cardlist);

  },
  'CookIntent': function() {
    this.emit('AMAZON.NextIntent');
  },
  'AMAZON.YesIntent': function() {

    this.emit('AMAZON.NextIntent');

  },
  'AMAZON.NoIntent': function() {

    this.emit(':tell', 'Okay, see you next time!');
  },
  'AMAZON.PauseIntent': function() {
    this.emit(':tell', 'Okay, you can come back to this skill to pick up where you left off.');
  },

  'AMAZON.NextIntent': function() {
    if (!this.attributes['currentStep']) {
      this.attributes['currentStep'] = 1;
    } else {
      this.attributes['currentStep'] = this.attributes['currentStep'] + 1;
    }
    var currentStep = this.attributes['currentStep'];
    var say = 'Step ' + currentStep + ', ' + data.steps[currentStep - 1];
    var sayOnScreen = data.steps[currentStep - 1];

    if (currentStep == data.steps.length) {

      delete this.attributes['currentStep'];
      this.emit(':tellWithCard', say + '. <say-as interpret-as="interjection">bon appetit</say-as>', this.t('TITLE'), say + '\nBon Appetit!', welcomeCardImg);

    } else {

      this.emit(':askWithCard', say, 'You can say Pause, Stop, or Next.', 'Step ' + currentStep, sayOnScreen);
    }

  },

  'AMAZON.RepeatIntent': function() {
    if (!this.attributes['currentStep']) {
      this.attributes['currentStep'] = 1;
    } else {
      this.attributes['currentStep'] = this.attributes['currentStep'] - 1;
    }

    this.emit('AMAZON.NextIntent');

  },
  'AMAZON.HelpIntent': function() {

    if (!this.attributes['currentStep']) { // new session
      this.emit(':ask', this.t('HELP'));
    } else {
      var currentStep = this.attributes['currentStep'];
      this.emit(':ask', 'you are on step ' + currentStep + ' of the ' + this.t('TITLE') + ' recipe. Say Next to continue or Ingredients to hear the list of ingredients.');
    }

  },
  'AMAZON.StartOverIntent': function() {
    delete this.attributes['currentStep'];
    this.emit('LaunchRequest');
  },
  'AMAZON.CancelIntent': function() {
    this.emit(':tell', this.t('STOP'));
  },
  'AMAZON.StopIntent': function() {
    this.emit(':tell', this.t('STOP'));
  },
  'SessionEndedRequest': function() {
    console.log('session ended!');
    this.emit(':saveState', true);
  },
  'Unhandled': function() {
    this.emit(':ask', 'I don\'t get it!', 'I don\'t get it!');
  },

};

//    END of Intent Handlers {} ========================================================================================
// 3. Helper Function  =================================================================================================

function sayArray(myData, andor) {
  //say items in an array with commas and conjunctions.
  // the first argument is an array [] of items
  // the second argument is the list penultimate word; and/or/nor etc.

  var listString = '';

  if (myData.length == 1) {
    //just say the one item
    listString = myData[0];
  } else {
    if (myData.length == 2) {
      //add the conjuction between the two words
      listString = myData[0] + ' ' + andor + ' ' + myData[1];
    } else if (myData.length == 4 && andor == 'and') {
      //read the four words in pairs when the conjuction is and
      listString = myData[0] + " and " + myData[1] + ", as well as, " +
        myData[2] + " and " + myData[3];

    } else {
      //build an oxford comma separated list
      for (var i = 0; i < myData.length; i++) {
        if (i < myData.length - 2) {
          listString = listString + myData[i] + ', ';
        } else if (i == myData.length - 2) { //second to last
          listString = listString + myData[i] + ', ' + andor + ' ';
        } else { //last
          listString = listString + myData[i];
        }
      }
    }
  }

  return (listString);
}

function randomArrayElement(array) {
  var i = 0;
  i = Math.floor(Math.random() * array.length);
  return (array[i]);
}
