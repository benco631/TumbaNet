pipeline {
    agent any

    environment {
        // VAPID
        VAPID_PUBLIC_KEY = credentials('VAPID_PUBLIC_KEY')
        NEXT_PUBLIC_VAPID_PUBLIC_KEY = credentials('NEXT_PUBLIC_VAPID_PUBLIC_KEY')
        VAPID_PRIVATE_KEY = credentials('VAPID_PRIVATE_KEY')
        VAPID_SUBJECT = credentials('VAPID_SUBJECT')

        // Firebase
        NEXT_PUBLIC_FIREBASE_PROJECT_ID = credentials('NEXT_PUBLIC_FIREBASE_PROJECT_ID')
        FIREBASE_CLIENT_EMAIL = credentials('FIREBASE_CLIENT_EMAIL')
        FIREBASE_PRIVATE_KEY = credentials('FIREBASE_PRIVATE_KEY')
        NEXT_PUBLIC_FIREBASE_API_KEY = credentials('NEXT_PUBLIC_FIREBASE_API_KEY')
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

        stage('Docker Build') {
            steps {
                sh '''
                docker build \
                --build-arg VAPID_PUBLIC_KEY="$VAPID_PUBLIC_KEY" \
                --build-arg NEXT_PUBLIC_VAPID_PUBLIC_KEY="$NEXT_PUBLIC_VAPID_PUBLIC_KEY" \
                --build-arg VAPID_PRIVATE_KEY="$VAPID_PRIVATE_KEY" \
                --build-arg VAPID_SUBJECT="$VAPID_SUBJECT" \
                --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="$NEXT_PUBLIC_FIREBASE_PROJECT_ID" \
                --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="$NEXT_PUBLIC_FIREBASE_API_KEY" \
                --build-arg FIREBASE_CLIENT_EMAIL="$FIREBASE_CLIENT_EMAIL" \
                --build-arg FIREBASE_PRIVATE_KEY="$FIREBASE_PRIVATE_KEY" \
                -t tumbanet:$BUILD_NUMBER .
                '''
            }
        }
    }
}