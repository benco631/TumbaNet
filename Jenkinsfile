pipeline {
    agent any

    environment {
        VAPID_PUBLIC_KEY = credentials('VAPID_PUBLIC_KEY')
        NEXT_PUBLIC_VAPID_PUBLIC_KEY = credentials('NEXT_PUBLIC_VAPID_PUBLIC_KEY')
        VAPID_PRIVATE_KEY = credentials('VAPID_PRIVATE_KEY')
        VAPID_SUBJECT = credentials('VAPID_SUBJECT')
    }

    stages {

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
    }
}