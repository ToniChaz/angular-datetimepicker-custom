'use strict';

angular.module('angular-datetimepicker-custom', []).directive('datetimepicker', [function () {

	/**
	NOTE: non '00' minute timezone offsets apparently do NOT work with moment.js dates... i.e. moment('2013-06-21 10:25:00 -07:30',  'YYYY-MM-DD HH:mm:ssZ') gives GMT-0700 NOT GMT-0730 as it should. So currently this function does NOT support tzToMinutes timezones that have minutes..
	
	moment.js apparently does not yet have a function / way to convert a date to a different timezone (other than 'local' and 'UTC'). As of 2013.06.21, see here:
	http://stackoverflow.com/questions/15347589/moment-js-format-date-in-a-specific-timezone (this says it can be done but it's not working for me - maybe it's only on non-stable branches of the code..)
	https://github.com/timrwood/moment/issues/482
	UPDATE: as of 2013.07.10 / moment v2.1 there IS timezone support but it's much bigger than this simple function here so sticking with this to avoid code bloat.
	
	@param {Object} dateMoment moment.js date object
	@param {Number} [tzFromMinutes] Timezone minutes offset from UTC to be converted FROM. If not supplied, the timezone offset will be pulled from the dateMoment object. I.e. 420 for -07:00 (Pacific Time)
	@param {Number} [tzToMinutes] Timzeone minutes offset from UTC to be converted TO. If not supplied, the timezone of the current user's computer / browser will be used (using moment().zone() with no arguments).
	@param {Object} [params]
		@param {String} [format] moment.js format string for what to output
	@return {Object}
		@param {Object} date moment.js date object in the tzToMinutes timzeone
		@param {String} [dateFormatted] Date in formatted specified by params.format (if supplied)
	*/
	function convertTimezone(dateMoment, tzFromMinutes, tzToMinutes, params) {
		var ret ={date: false, dateFormatted:false};
		if(tzFromMinutes ===undefined || (!tzFromMinutes && tzFromMinutes !==0)) {
			tzFromMinutes =dateMoment.zone();
		}
		if(tzToMinutes ===undefined || (!tzToMinutes && tzToMinutes !==0)) {
			tzToMinutes =moment().zone();		//get user timezone
		}
		
		//use moment function to convert (doesn't work..)
		// dateMoment =dateMoment.zone(tzOffsetMinutes);
		// dateFormatted =dateMoment.format('YYYY-MM-DD HH:mm:ssZ');
		
		var tzDiffMinutes =tzToMinutes -tzFromMinutes;
		if(tzDiffMinutes >-1) {
			dateMoment =dateMoment.subtract('minutes', tzDiffMinutes);
		}
		else {
			dateMoment =dateMoment.add('minutes', tzDiffMinutes);
		}
		
		//manually add timezone offset
		var dateFormatted =dateMoment.format('YYYY-MM-DD HH:mm:ss');		//temporary string that will be used to form the final moment date object AFTER timezone conversion is done (since doesn't seem to be a way to change the timezone on an existing moment date object.. - if there was, we wouldn't need this entire function at all!)
		var tzToMinutesAbsVal =tzToMinutes;
		if(tzToMinutesAbsVal <0) {
			tzToMinutesAbsVal =tzToMinutesAbsVal *-1;
		}
		var hrOffset =Math.floor(tzToMinutesAbsVal /60).toString();
		if(hrOffset.length ==1) {
			hrOffset ='0'+hrOffset;
		}
		var minutesOffset =(tzToMinutesAbsVal %60).toString();
		if(minutesOffset.length ==1) {
			minutesOffset ='0'+minutesOffset;
		}
		var plusMinus ='+';
		if(tzToMinutes >=0) {
			plusMinus ='-';
		}
		var tzOffsetString =plusMinus+hrOffset+':'+minutesOffset;
		dateFormatted+=''+tzOffsetString;
		
		ret.date =moment(dateFormatted, 'YYYY-MM-DD HH:mm:ssZ');
		if(params.format !==undefined) {
			ret.dateFormatted =ret.date.format(params.format);
		}
		
		return ret;
	}
	
	return {
		restrict: 'A',
		//transclude: true,
		scope: {
			ngModel: '=',
			validate: '&',
			ngChange: '&?',
			opts: '=',
			ngClick: '&?'
		},

		replace: true,
		template: function(element, attrs) {
			var type ='pikaday';
			if(typeof(forge) !=='undefined' && forge && forge !==undefined) {
				type ='forge';		//TriggerIO
			}
			// console.log('datetimepicker type: '+type);
			
			if(!attrs.placeholder) {
				attrs.placeholder ='Choose a date/time';
			}
			
			var class1 ='';
			if(attrs.class) {
				class1+=attrs.class;
			}
			
			//copy over attributes
			var customAttrs ='';		//string of attrs to copy over to input
			var skipAttrs =['datetimepicker', 'ngModel', 'label', 'type', 'placeholder', 'opts', 'name', 'validate', 'ngChange', 'ngClick'];
			angular.forEach(attrs, function (value, key) {
				if (key.charAt(0) !== '$' && skipAttrs.indexOf(key) === -1) {
					customAttrs+=attrs.$attr[key];
					if(attrs[key]) {
						customAttrs+='='+attrs[key];
					}
					customAttrs+=' ';
				}
			});
			
			var html ="<div class='"+class1+"'>";
				if(type =='pikaday') {
					html +="<input type='datetime' placeholder='"+attrs.placeholder+"' "+customAttrs+" ";		//NOTE: do NOT use ng-model here since we want the displayed value to potentially be DIFFERENT than the returned (ngModel) value
					if(attrs.ngClick) {
						html +="ng-click='ngClick()' ";
					}
					html +="/>";
					// html+="<br />{{ngModel}}";
				}
				else if(type =='forge') {
					html +="<input type='datetime-local' placeholder='"+attrs.placeholder+"' "+customAttrs+" ";		//NOTE: do NOT use ng-model here since we want the displayed value to potentially be DIFFERENT than the returned (ngModel) value (this especially breaks iOS native datetime input display)		//UPDATE for iOS7 - need to use 'datetime-local' since 'datetime' input type is no longer supported..
					if(attrs.ngClick) {
						html +="ng-click='ngClick()' ";
					}
					html +="/>";
					// html+="<br />{{ngModel}}";
				}
			html+="</div>";
			
			//copy over to attrs so can access later
			attrs.type =type;
			
			return html;
		},
			
		link: function(scope, element, attrs) {
			//extend defaults
			var defaults ={
				opts: {
					formatModel: 'YYYY-MM-DD HH:mm:ssZ',
					formatDisplay: 'YYYY-MM-DD HH:mm:ssZ',
					revertOnInvalid: false
				}
			};
			scope.opts =angular.extend(defaults.opts, scope.opts);
		
			//if was in an ng-repeat, they'll have have the same compile function so have to set the id here, NOT in the compile function (otherwise they'd all be the same..)
			if(scope.opts.id !==undefined) {
				attrs.id =scope.opts.id;
			}
			else if(attrs.id ===undefined) {
				attrs.id ="jrgDatetimepicker"+Math.random().toString(36).substring(7);
			}
			//update the OLD name with the NEW name
			element.find('input').attr('id', attrs.id);
			
			var triggerSkipSelect =true;		//trigger to avoid validating, etc. on setting initial/default value
			
			var inputFormatString;
			
			if(attrs.type =='forge') {
				// inputFormatString ='YYYY-MM-DDTHH:mm:ssZ';
				inputFormatString ='YYYY-MM-DDTHH:mm:ss';		//datetime-local now so no timezone (including it will not properly set the input (default) value)
				
				forge.ui.enhanceInput('#'+attrs.id);
				
				//set initial value
				if(scope.ngModel) {
					setModelVal(scope.ngModel);
				}
				
				//doesn't fire
				// element.find('input').bind('change', function() {
					// console.log('bind change - ngModel: '+scope.ngModel);
					// onSelectDate(scope.ngModel);
				// });
				element.find('input').bind('blur', function() {
					// var value =scope.ngModel;		//is blank..
					var date =document.getElementById(attrs.id).value;
					// console.log('typeof(date): '+typeof(date)+' date: '+date);
					var dateMoment;
					var tzFromMinutes =false;
					if(typeof(date) =='object') {		//assume javascript date object
						dateMoment =moment(date);
					}
					else if(typeof(date) =='string') {		//assume Android, which apparently gives YYYY-MM-DDTHH:mmZ format..
						dateMoment =moment(date, 'YYYY-MM-DD HH:mm');
						if(date.indexOf('Z') >-1) {
							tzFromMinutes =0;
						}
					}
					
					//convert to local timezone (so it matches what the user actually selected)
					var format1 ='YYYY-MM-DD HH:mm:ssZ';
					var dtInfo =convertTimezone(dateMoment, tzFromMinutes, false, {'format':format1});
					var formattedModelVal =moment(dtInfo.dateFormatted, format1).format(scope.opts.formatModel);
					
					//update input value with non UTC value
					// var inputFormat =dtInfo.date;		//not working
					// var inputFormat =dtInfo.dateFormatted;		//kind of works for Android but not completely and not at all for iOS..
					var inputFormat =dtInfo.date.format(inputFormatString);
					document.getElementById(attrs.id).value =inputFormat;
					
					onSelectDate(formattedModelVal);
				});
			}
			else {		//pikaday
				var defaultPikadayOpts ={
					field: document.getElementById(attrs.id),
					onSelect: function() {
						var date =this.getMoment().format(scope.opts.formatModel);
						onSelectDate(date);
					},
					
					// format: 'H:mma, ddd MMM D, YYYY',
					//defaultDate and setDefaultDate don't seem to work (easily - format is finicky - so setting manually below after initialization)
					// defaultDate: new Date('2010-01-01 12:02:00'),		//doesn't work
					// defaultDate: new Date('2010-01-01'),		//works
					// defaultDate: new Date(scope.ngModel),
					// setDefaultDate: true,
					
					minDate: new Date('2000-01-01'),
					maxDate: new Date('2020-12-31'),
					yearRange: [2000, 2020]
					
					// showTime: true
				};
				if(scope.opts.pikaday ===undefined) {
					scope.opts.pikaday ={};
				}
				scope.opts.pikaday.format =scope.opts.formatDisplay;		//overwrite with passed in (or default) format
				var pikadayOpts =angular.extend(defaultPikadayOpts, scope.opts.pikaday);
				
				var picker =new Pikaday(pikadayOpts);
				
				//set initial value
				if(scope.ngModel) {
					setModelVal(scope.ngModel);
				}				
			}
			
			triggerSkipSelect =false;		//NOW can validate, etc. as usual
			
			/**
			@toc 4.
			@method setModelVal
			@param {String} val The value to set the ngModel to - will NOT be re-formatted so it should already be in the corrent string format (must match scope.opts.formatModel)
			*/
			function setModelVal(val) {
				scope.ngModel =val;
				if(attrs.type =='forge') {
					//native inputs need input value to be a javascript date object? So need to convert it.
					var dateObj =moment(scope.ngModel, scope.opts.formatModel);
					var inputFormat =dateObj.format(inputFormatString);
					document.getElementById(attrs.id).value =inputFormat;
				}
				else {
					var dateFormat ='YYYY-MM-DD';
					var timeFormat ='HH:mm:ss';
					var modelFormatted =moment(scope.ngModel, scope.opts.formatModel).format(dateFormat+' '+timeFormat+'Z');
					var dateOnly =modelFormatted;
					var timeOnly ='';
					if(modelFormatted.indexOf(' ') >-1) {
						dateOnly =modelFormatted.slice(0,modelFormatted.indexOf(' '));
						timeOnly =modelFormatted.slice((modelFormatted.indexOf(' ')+1), modelFormatted.length);
					}

					// picker.setDate(dateOnly);		//this will mess up due to timezone offset
					picker.setMoment(moment(dateOnly, dateFormat));		//this works (isn't affected by timezone offset)
					// picker.setTime(scope.ngModel);		//doesn't work; nor does picker.setTime([hour], [minute], [second]);
					picker.setTimeMoment(moment(timeOnly, timeFormat));
				}
			}
			
			/**
			Allow updating value from outside directive ($watch doesn't work since it will fire infinitely from within the directive when a date/time is chosen so have to use a skip trigger or have to use $on instead to make it more selective. $on seems easier though it does require setting an scope.opts.id value)
			@toc 4.5.
			@method $scope.$on('jrgDatetimepickerUpdateVal',..
			@param {Object} params
				@param {String} instId
				@param {String} val Correctly formatted date(time) string (must match scope.opts.formatModel) to set ngModel to
			*/
			scope.$on('datetimepickerUpdateVal', function(evt, params) {
				if(scope.opts.id !==undefined && params.instId !==undefined && scope.opts.id ==params.instId) {		//only update if the correct instance
					setModelVal(params.val);
				}
			});
			
			/**
			@toc 1.5.
			@method scope.onSelectDate
			*/
			/*
			scope.onSelectDate =function() {
				console.log('scope.onSelectDate - ngModel: '+scope.ngModel);
				onSelectDate(scope.ngModel);
			};
			*/
			
			/**
			@toc 1.
			@method onSelectDate
			@param {String} date The date to set in scope.opts.formatModel - MUST already be in correct format!
			*/
			function onSelectDate(date) {
				if(!triggerSkipSelect) {
					var existingVal =scope.ngModel;		//save for revert later if needed
					
					updateModel(date, {});		//update ngModel BEFORE validation so the validate function has the value ALREADY set so can compare to other existing values (passing back the new value by itself without ngModel doesn't allow setting it so the function may not know what instance this value corresponds to). We'll re-update the model again later if invalid.
					
					if(scope.validate !==undefined && scope.validate() !==undefined && typeof(scope.validate()) =='function') {		//this is an optional scope attr so don't assume it exists
						scope.validate()(date, {opts: scope.opts}, function(valid) {
							if(!valid) {		//may NOT want to blank out values actually (since datepicker closes on selection, this makes it impossible to change the time (to a valid one) after select a date). But as long as they pick the TIME first, they're okay (since time doesn't auto close the picker, only date does).
								var blankOut =true;
								//if have a (valid) existing value/date AND revert option is set, revert date
								if(scope.opts.revertOnInvalid && existingVal) {
									blankOut =false;
									setModelVal(existingVal);
								}
								
								if(blankOut) {		//blank out
									date ='';
									//update pikaday plugin with blank date
									// picker.setDate(date);		//not working..
									document.getElementById(attrs.id).value ='';
									updateModel(date, {});
								}
							}
							else {
								handleValidOnchange(date, {});
							}
						});
					}
					else {		//assume valid since no validate function defined
						handleValidOnchange(date, {});
					}
					if(!scope.$$phase) {
						scope.$apply();
					}
				}
			}
			
			/**
			@toc 2.
			@method updateModel
			*/
			function updateModel(date, params) {
				scope.ngModel =date;
				if(!scope.$$phase) {
					scope.$apply();
				}
			}
			
			/**
			@toc 3.
			@method handleValidOnchange
			*/
			function handleValidOnchange(date, params) {
				if(scope.ngChange !==undefined && scope.ngChange() !==undefined && typeof(scope.ngChange()) =='function') {		//this is an optional scope attr so don't assume it exists
					scope.ngChange()(date, {opts: scope.opts});
				}
			}
		}
	};
}]);