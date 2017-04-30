var config = {};

config.appSettings  = {
    appDisplayName : 'YourAppDisplayNameHere',
    versionNumber: "IONIC_APP_VERSION_NUMBER_PLACEHOLDER",
    lowercaseAppName : 'yourlowercaseappnamehere',
    appDescription : "yourAppDescriptionHere",
    appleId: null,
    ionicAppId: null,
    cordovaLocalNotificationsEnabled : false,
    linkToChromeExtension : "https://chrome.google.com/webstore/detail/quantimodo-life-tracking/jioloifallegdkgjklafkkbniianjbgi",
    defaultState : 'app.remindersInbox',
    welcomeState : 'app.welcome',
    appStorageIdentifier: 'YourAppDisplayNameHereData*',
    headline : 'Sync and Analyze Your Data',
    features: [
        ' - Automatically backup and sync your data across devices',
        ' - Track diet, treatments, symptoms, and anything else',
        ' - Analyze your data to see the strongest predictors of your mood'
    ],
    primaryOutcomeVariableName : "Overall Mood",
    welcomeText : "Let's start off by reporting your first mood below",
    mobileNotificationText : "Time to track!",
    backgroundColor: '#3467d6',  // TODO: Make background color configurable
    intro : [
        // screen 1
        {
            img : {
                width : '250',
                height : '250',
                url : 'img/intro/intro_import.png'
            },
            textColor: 'white',
            backgroundColor: '#3467d6',
            content : {
                firstParagraph : {
                    visible : true,
                    content : 'Import Data',
                    classes : 'intro-header'
                },
                logoDiv : {
                    visible : true,
                    id : 'logo'
                },
                finalParagraph : {
                    visible : true,
                    content : 'Import data from all your apps and devices',
                    classes : 'intro-paragraph',
                    buttonBarVisible : true
                }
            }
        },
        {
            img : {
                width : '250',
                height : '250',
                url : 'img/intro/intro_track_anything.png'
            },
            textColor: 'white',
            backgroundColor: '#f09402',
            content : {
                firstParagraph : {
                    visible : true,
                    content : 'Track Anything',
                    classes : 'intro-header'
                },
                logoDiv : {
                    visible : true,
                    id : 'logo'
                },
                finalParagraph : {
                    visible : true,
                    content : 'Log treatments, diet, symptoms, emotions, and anything else',
                    classes : 'intro-paragraph',
                    buttonBarVisible : true
                }
            }
        },
        {
            img : {
                width : '250',
                height : '250',
                url : 'img/intro/intro_make_discoveries.png'
            },
            textColor: 'white',
            backgroundColor: '#0f9d58',
            content : {

                firstParagraph : {
                    visible : true,
                    content : 'Make Discoveries',
                    classes : 'intro-header'
                },

                logoDiv : {
                    visible : true,
                    id : 'logo'
                },
                finalParagraph: {
                    visible : true,
                    content : 'Identify hidden factors most strongly linked to your well-being',
                    classes : 'intro-paragraph',
                    buttonBarVisible : true
                }
            }
        }
    ],
    helpPopupMessages : {
        "#/app/example":'Positive Predictors are the factors most predictive of <span class="positive">IMPROVING</span> Mood for the average user.',
    },
    remindersInbox : {},
    wordAliases : {},
    floatingMaterialButton : {
        button1 : {
            icon: 'ion-android-notifications-none',
            label: 'Add a Reminder',
            stateAndParameters: "'app.reminderSearch'"
        },
        button2 : {
            icon: 'ion-compose',
            label: 'Record a Measurement',
            stateAndParameters: "'app.measurementAddSearch'"
        },
        button3 : {
            icon: 'ion-ios-cloud-download-outline',
            label: 'Import Data',
            stateAndParameters: "'app.import'"
        },
        button4 : {
            icon: 'ion-ios-star',
            label: 'Add a Favorite Variable',
            stateAndParameters: "'app.favoriteSearch'"
        }
    },
    menuType: null,
    menu : [
        {
            title : 'Reminder Inbox',
            href : '#/app/reminders-inbox',
            icon: 'ion-archive'
        },
        {
            title : 'Favorites',
            href : '#/app/favorites',
            icon: 'ion-ios-star'
        },
        {
            title : 'Overall Mood',
            click : 'togglePrimaryOutcomeSubMenu',
            showSubMenuVariable : 'showPrimaryOutcomeSubMenu',
            icon: 'ion-happy-outline',
            subMenu: [
                {
                    title : 'Charts',
                    showSubMenuVariable : 'showPrimaryOutcomeSubMenu',
                    href : '#/app/track',
                    icon: 'ion-arrow-graph-up-right'
                },
                {
                    title : 'History',
                    showSubMenuVariable : 'showPrimaryOutcomeSubMenu',
                    href : '#/app/history',
                    icon: 'ion-ios-list-outline'
                },
                {
                    title : 'Positive Predictors',
                    showSubMenuVariable : 'showPrimaryOutcomeSubMenu',
                    href : '#/app/predictors-positive',
                    icon: 'ion-happy-outline'
                },
                {
                    title : 'Negative Predictors',
                    showSubMenuVariable : 'showPrimaryOutcomeSubMenu',
                    href : '#/app/predictors-negative',
                    icon: 'ion-sad-outline'
                }]
        },
        {
            title : 'Manage Reminders',
            click : 'toggleReminderSubMenu',
            showSubMenuVariable : 'showReminderSubMenu',
            icon: 'ion-android-notifications-none',
            subMenu: [
                {
                    title : 'All Reminders',
                    showSubMenuVariable : 'showReminderSubMenu',
                    href : '#/app/reminders-manage/Anything',
                    icon: 'ion-android-globe'
                },
                {
                    title : 'Emotions',
                    showSubMenuVariable : 'showReminderSubMenu',
                    href : '#/app/reminders-manage/Emotions',
                    icon: 'ion-happy-outline'
                },
                {
                    title : 'Foods',
                    showSubMenuVariable : 'showReminderSubMenu',
                    href : '#/app/reminders-manage/Foods',
                    icon: 'ion-ios-nutrition-outline'
                },
                {
                    title : 'Physical Activity',
                    showSubMenuVariable : 'showReminderSubMenu',
                    href : '#/app/reminders-manage/Physical Activity',
                    icon: 'ion-ios-body-outline'
                },
                {
                    title : 'Symptoms',
                    showSubMenuVariable : 'showReminderSubMenu',
                    href : '#/app/reminders-manage/Symptoms',
                    icon: 'ion-sad-outline'
                },
                {
                    title : 'Treatments',
                    showSubMenuVariable : 'showReminderSubMenu',
                    href : '#/app/reminders-manage/Treatments',
                    icon: 'ion-ios-medkit-outline'
                },
                {
                    title : 'Vital Signs',
                    showSubMenuVariable : 'showReminderSubMenu',
                    href : '#/app/reminders-manage/Vital Signs',
                    icon: 'ion-ios-pulse'
                },
            ],
        },
        {
            title : 'Record Measurement',
            click : 'toggleTrackingSubMenu',
            showSubMenuVariable : 'showTrackingSubMenu',
            subMenu: [
                {
                    title : 'Track Anything',
                    showSubMenuVariable : 'showTrackingSubMenu',
                    href : '#/app/measurement-add-search',
                    icon: 'ion-android-globe'
                },
                {
                    title : 'Record a Meal',
                    showSubMenuVariable : 'showTrackingSubMenu',
                    href : '#/app/measurement-add-search-category/Foods',
                    icon: 'ion-ios-nutrition-outline'
                },
                {
                    title : 'Rate an Emotion',
                    showSubMenuVariable : 'showTrackingSubMenu',
                    href : '#/app/measurement-add-search-category/Emotions',
                    icon: 'ion-happy-outline'
                },
                {
                    title : 'Rate a Symptom',
                    showSubMenuVariable : 'showTrackingSubMenu',
                    href : '#/app/measurement-add-search-category/Symptoms',
                    icon: 'ion-ios-pulse'
                },
                {
                    title : 'Record a Treatment',
                    showSubMenuVariable : 'showTrackingSubMenu',
                    href : '#/app/measurement-add-search-category/Treatments',
                    icon: 'ion-ios-medkit-outline'
                },
                {
                    title : 'Record Activity',
                    showSubMenuVariable : 'showTrackingSubMenu',
                    href : '#/app/measurement-add-search-category/Physical Activity',
                    icon: 'ion-ios-body-outline'
                },
                {
                    title : 'Record Vital Sign',
                    showSubMenuVariable : 'showTrackingSubMenu',
                    href : '#/app/measurement-add-search-category/Vital Signs',
                    icon: 'ion-ios-pulse'
                },
            ],
            icon: 'ion-compose',
        },
        {
            title : 'History',
            click : 'toggleHistorySubMenu',
            showSubMenuVariable : 'showHistorySubMenu',
            subMenu: [
                {
                    title : 'All Measurements',
                    showSubMenuVariable : 'showHistorySubMenu',
                    href : '#/app/history-all/Anything',
                    icon: 'ion-android-globe'
                },
                {
                    title : 'Emotions',
                    showSubMenuVariable : 'showHistorySubMenu',
                    href : '#/app/history-all/Emotions',
                    icon: 'ion-happy-outline'
                },
                {
                    title : 'Foods',
                    showSubMenuVariable : 'showHistorySubMenu',
                    href : '#/app/history-all/Foods',
                    icon: 'ion-ios-nutrition-outline'
                },
                {
                    title : 'Symptoms',
                    showSubMenuVariable : 'showHistorySubMenu',
                    href : '#/app/history-all/Symptoms',
                    icon: 'ion-sad-outline'
                },
                {
                    title : 'Treatments',
                    showSubMenuVariable : 'showHistorySubMenu',
                    href : '#/app/history-all/Treatments',
                    icon: 'ion-ios-medkit-outline'
                },
                {
                    title : 'Physical Activity',
                    showSubMenuVariable : 'showHistorySubMenu',
                    href : '#/app/history-all/Physical Activity',
                    icon: 'ion-ios-body-outline'
                },
                {
                    title : 'Vital Signs',
                    showSubMenuVariable : 'showHistorySubMenu',
                    href : '#/app/history-all/Vital Signs',
                    icon: 'ion-ios-pulse'
                },
                {
                    title : 'Locations',
                    showSubMenuVariable : 'showHistorySubMenu',
                    href : '#/app/history-all/Location',
                    icon: 'ion-ios-location-outline'
                },
            ],
            icon: 'ion-ios-list-outline',
        },
        {
            title : 'Import Data',
            href : '#/app/import',
            icon: 'ion-ios-cloud-download-outline'
        },
        {
            title : 'Charts',
            href : '#/app/chart-search',
            icon: 'ion-arrow-graph-up-right'
        },
        {
            title : 'Relationships',
            click : 'togglePredictorSearchSubMenu',
            showSubMenuVariable : 'showPredictorSearchSubMenu',
            subMenu: [
                {
                    title : 'Predictor Search',
                    showSubMenuVariable : 'showPredictorSearchSubMenu',
                    href : '#/app/predictor-search',
                    icon: 'ion-log-in'
                },
                {
                    title : 'Outcome Search',
                    showSubMenuVariable : 'showPredictorSearchSubMenu',
                    href : '#/app/outcome-search',
                    icon: 'ion-log-out'
                },
                {
                    title : 'Positive Mood',
                    showSubMenuVariable : 'showPredictorSearchSubMenu',
                    href : '#/app/predictors-positive',
                    icon: 'ion-happy-outline'
                },
                {
                    title : 'Negative Mood',
                    showSubMenuVariable : 'showPredictorSearchSubMenu',
                    href : '#/app/predictors-negative',
                    icon: 'ion-sad-outline'
                },
            ],
            icon: 'ion-ios-analytics',
        },
        {
            title : 'Settings',
            href : '#/app/settings',
            icon: 'ion-ios-gear-outline'
        },
        {
            title : 'Help & Feedback',
            href : "#/app/feedback",
            icon: 'ion-ios-help-outline'
        }
    ]
};
if(!module){
    var module = {};
}
module.exports = config.appSettings;