'use strict';

angular.module('daTiPi', [
	'ngRoute',
	'angular-datetimepicker-custom'
]).
config(['$routeProvider',
	function($routeProvider) {	
	
	$routeProvider
	.when('/', {
		templateUrl: 'views/home.html'
	})
	.otherwise({
		redirectTo: '/home'
	});
	
}]);