# AngularJS DateTimePicker Directive

## Dependencies
- `momentjs`
- datetimepicker forked from jackrabbitsgroup datetimepicker project
- Pikaday (included in this package - it's an edited version of the Pikaday time picker fork ( https://github.com/owenmead/Pikaday ), just make sure to include it)

## Install
1. bower install https://github.com/ToniChaz/angular-datetimepicker-custom --save

2. include the module in angular - `angular-datetimepicker-custom`

## Documentation
Wrapper for pikaday datepicker (and timepicker)
ALSO works for TriggerIO forge native input
NOTE: native datetime inputs MUST have this format for values (otherwise they won't display and/or won't start on the correct date when the picker comes up) - 'YYYY-MM-DDTHH:mm:ssZ' i.e. '2012-05-18T00:01:02+03:00'
http://stackoverflow.com/questions/8177677/ios5-safari-display-value-for-datetime-type-in-forms

Pikaday:
https://github.com/owenmead/Pikaday (NOTE: this is the forked version that has the timepicker. It's not well documented but there's 3 additional options when loading the timepicker: showTime: false, showSeconds: false, use24hour: false
NOTE: I added in a "setTimeMoment" function to the forked file so it's now using pikaday-luke-edit.js with this new function

@dependencies:
- pikaday.js & pikaday.css
- moment.js

scope (attrs that must be defined on the scope (i.e. in the controller) - they can't just be defined in the partial html)
* @param {String} ngModel Datetime string in format specified by opts.formatModel [see below]. Time is optional.
* @param {Function} validate Will be called everytime date changes PRIOR to setting the value of the date. Will pass the **following parameters:**
	* @param {String} date
	* @param {Object} params
	* @param {Object} opts The opts passed in
	* @param {Function} callback Expects a return of {Boolean} true if valid, false otherwise. If false, the value will be set to blank.
* @param {Function} ngChange Will be called everytime date changes. Will pass the following parameters:
	* @param {String} date
	* @param {Object} params
	* @param {Object} opts The opts passed in
* @param {Object} opts
	* @param {String} [formatModel ='YYYY-MM-DD HH:mm:ssZ'] The string datetime format for the actual value
	* @param {String} [formatDisplay ='YYYY-MM-DD HH:mm:ssZ'] NOT SUPPORTED FOR FORGE/TRIGGERIO NATIVE INPUTS. The string datetime format to display in the input - this will overwrite the pikaday.format value
	* @param {Object} pikaday Opts to be used (will extend defaults) for pikaday - see https://github.com/owenmead/Pikaday for list of options. NOTE: the 'format' field will be overwritten by opts.formatDisplay so set format there instead.
	* @param {String} [id] Will over-write attrs.id value if set (used for the input id)
	* @param {Boolean} [revertOnInvalid =false] true to revert the value/date to the PREVIOUS value if invalid (otherwise will blank out on invalid)
* @param {Function} ngClick Declared on scope so it can be 'passed through' from parent controller; just use as normal ng-click

**attrs:**
**@param {String} [placeholder ='Choose a date/time'] Placeholder text for input**
#### EXAMPLE usage:
_views/example.html_
```sh
<div datetimepicker ng-model='ngModel' validate='validateDate' ng-change='onchangeDate' opts='opts'></div>
```

_controller/example.js_
```sh
$scope.ngModel ='';

$scope.opts ={
	pikaday: {
		//firstDay: 1,		//start on Monday
		showTime: true		//show timepicker as well
	}
};

$scope.validateDate =function(date, params, callback) {
	if(1) {
		callback(true);		//valid
	}
	else {
		callback(false);		//invalid
	}
};

$scope.onchangeDate =function(date, params) {
	console.log(date);
};
```