angular.module('starter')
    // Handles the Notifications (inapp, push)
    .factory('notificationService',function($state){

        //Notification intervals in minutes
        var intervals = {
            "minute":1,
            "five_minutes":5,
            "hourly":60,
            "three":180,
            "twice": 720,
            "daily": 1440
        };

        return {
            // schedule new notifications
            scheduleNotification:function(interval){

                console.log(interval);
                if(typeof cordova != "undefined"){
                    if(ionic.Platform.isAndroid()){
                        cordova.plugins.notification.local.cancelAll(function(){
                            if(interval!="never"){
                                cordova.plugins.notification.local.schedule({
                                    text: config.appSettings.mobileNotificationText,
                                    every: intervals[interval],
                                    icon: config.appSettings.mobileNotificationImage,
                                    id : 1
                                }, function(){
                                    console.log('notification scheduled');
                                });
                                cordova.plugins.notification.local.on("click", function (notification) {
                                });
                            }
                        });
                    } else if(ionic.Platform.isIPad() || ionic.Platform.isIOS()){
                        cordova.plugins.notification.local.cancelAll(function(){
                            if(interval!="never"){
                                cordova.plugins.notification.local.schedule({
                                    text: config.appSettings.mobileNotificationText,
                                    every: interval,
                                    icon: config.appSettings.mobileNotificationImage,
                                    id : 1
                                }, function(){
                                    console.log('notification scheduled');
                                });
                                cordova.plugins.notification.local.on("click", function (notification) {
                                });
                            }
                        });
                    }
                   
                }
                else if(window.chrome && chrome.runtime && chrome.runtime.id){
                    chrome.alarms.clear("trackReportAlarm");
                    var alarmInfo = {periodInMinutes: intervals[interval]};
                    chrome.alarms.create("trackReportAlarm", alarmInfo);
                    console.log("Alarm set, every " + intervals[interval] + " minutes");
                }
            },

            // cancel all existing notifications
            cancelNotifications: function(){
                if(typeof cordova != "undefined"){
                    cordova.plugins.notification.local.cancelAll(function(){
                        console.log('notifications cancelled');
                    });
                }else if(typeof chrome.alarms != "undefined"){
                    chrome.alarms.clear("trackReportAlarm");
                }

            },

            scheduleReminder:function(params){
                var text = "Reminder " + params['variableName'];
                if (params['frequency'] != "Daily") {
                    if(typeof cordova != "undefined"){
                        //Android and iOS
                        cordova.plugins.notification.local.clearAll(function(){
                            if(params['frequency'] != "Never"){
                                cordova.plugins.notification.local.schedule({
                                    text: text,
                                    every: intervals[interval],
                                    icon: config.appSettings.notification_image,
                                    id : 1
                                }, function(){
                                    console.log('notification scheduled');
                                });
                                cordova.plugins.notification.local.on("click", function (notification) {
                                });
                            }
                        });
                    }
                    else if(window.chrome && chrome.runtime && chrome.runtime.id){
                        chrome.alarms.clear("trackReportAlarm");
                        var alarmInfo = {periodInMinutes: intervals[interval]};
                        chrome.alarms.create("trackReportAlarm", alarmInfo);
                        console.log("Alarm set, every " + intervals[interval] + " minutes");
                    }
                } else {
                    // var d = new Date();
                    // d.setHours(14);
                    // cordova.plugins.notification.local.schedule({
                    //     id:      1,
                    //     text:   text,
                    //     every:  'day',
                    //     at:    d
                    // });
                }
            }
        }
    });