'use strict';

angular.module('angular-datetimepicker-custom', [])
.directive('datetimepicker', [function () {	
	return {
		restrict: 'A',
		scope: {
			ngModel: '=',
			validate: '&',
			ngChange: '&?',
			opts: '=',
			ngClick: '&?'
		},
		replace: true,
		template: function(element, attrs) {
			var type = 'pikaday';			
			
			if (!attrs.placeholder) {
				attrs.placeholder ='Choose a date/time';
			}
			
			var class1 = '';
			if (attrs.class) {
				class1 += attrs.class;
			}
			
			//copy over attributes
			var customAttrs = ''; // string of attrs to copy over to input
			var skipAttrs =[
					'datetimepicker', 
					'ngModel', 
					'label', 
					'type', 
					'placeholder', 
					'opts', 
					'name', 
					'validate', 
					'ngChange', 
					'ngClick'
				];

			angular.forEach(attrs, function (value, key) {
				if (key.charAt(0) !== '$' && skipAttrs.indexOf(key) === -1) {
					customAttrs += attrs.$attr[key];
					if(attrs[key]) {
						customAttrs += '=' + attrs[key];
					}
					customAttrs += ' ';
				}
			});
			
			var html ="<div class='" + class1 + "'>";
				if (type === 'pikaday') {
					html += "<input type='datetime' placeholder='" + attrs.placeholder + "' " + customAttrs + " ";		//NOTE: do NOT use ng-model here since we want the displayed value to potentially be DIFFERENT than the returned (ngModel) value
					if(attrs.ngClick) {
						html +="ng-click='ngClick()' ";
					}
					html +="/>";
				} else if(type == 'forge') {
					html +="<input type='datetime-local' placeholder='"+attrs.placeholder+"' "+customAttrs+" ";		//NOTE: do NOT use ng-model here since we want the displayed value to potentially be DIFFERENT than the returned (ngModel) value (this especially breaks iOS native datetime input display)		//UPDATE for iOS7 - need to use 'datetime-local' since 'datetime' input type is no longer supported..
					if(attrs.ngClick) {
						html +="ng-click='ngClick()' ";
					}
					html +="/>";
				}
				html+="</div>";
			
			//copy over to attrs so can access later
			attrs.type =type;
			
			return html;
		},
			
		link: function(scope, element, attrs) {			
			//if was in an ng-repeat, they'll have have the same compile function so have to set the id here, NOT in the compile function (otherwise they'd all be the same..)
			if(scope.opts.id !==undefined) {
				attrs.id =scope.opts.id;
			}
			else if(attrs.id ===undefined) {
				attrs.id ="datetimepicker"+Math.random().toString(36).substring(7);
			}
			//update the OLD name with the NEW name
			element.find('input').attr('id', attrs.id);
			
			var triggerSkipSelect = true;		//trigger to avoid validating, etc. on setting initial/default value			
			
			// Pikaday
			var defaultPikadayOpts ={
				field: document.getElementById(attrs.id),
				onSelect: function(date) {
					onSelectDate(date);
				},				
			
				minDate: new Date('2000-01-01'),
				maxDate: new Date('2020-12-31'),
				yearRange: [2000, 2020]

			};

			if (scope.opts.pikaday === undefined) {
				scope.opts.pikaday = {};
			}

			scope.opts.pikaday.format =scope.opts.formatDisplay; //overwrite with passed in (or default) format
			var pikadayOpts =angular.extend(defaultPikadayOpts, scope.opts.pikaday);
			
			var picker = new Pikaday(pikadayOpts);
			
			//set initial value
			if(scope.ngModel) {
				setModelVal(scope.ngModel);
			}	
			
			triggerSkipSelect =false; // NOW can validate, etc. as usual
			
			/**
			@method setModelVal
			@param {String} val The value to set the ngModel to - will NOT be re-formatted so it should already be in the corrent string format (must match scope.opts.formatModel)
			*/
			function setModelVal(val) {
				console.log(val);
				scope.ngModel =val;
				
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
			
			/**
			Allow updating value from outside directive ($watch doesn't work since it will fire infinitely from within the directive when a date/time is chosen so have to use a skip trigger or have to use $on instead to make it more selective. $on seems easier though it does require setting an scope.opts.id value)
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
			@method updateModel
			*/
			function updateModel(date, params) {
				scope.ngModel =date;
				if(!scope.$$phase) {
					scope.$apply();
				}
			}
			
			/**
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