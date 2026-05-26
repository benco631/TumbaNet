pipeline {
    agent any

    environment {
        VAPID_PUBLIC_KEY = credentials('VAPID_PUBLIC_KEY')
        NEXT_PUBLIC_VAPID_PUBLIC_KEY = credentials('NEXT_PUBLIC_VAPID_PUBLIC_KEY')
        VAPID_PRIVATE_KEY = credentials('VAPID_PRIVATE_KEY')
        VAPID_SUBJECT = credentials('VAPID_SUBJECT')

        NEXT_PUBLIC_FIREBASE_PROJECT_ID = credentials('NEXT_PUBLIC_FIREBASE_PROJECT_ID')
        NEXT_PUBLIC_FIREBASE_API_KEY = credentials('NEXT_PUBLIC_FIREBASE_API_KEY')

        FIREBASE_CLIENT_EMAIL = credentials('FIREBASE_CLIENT_EMAIL')
        FIREBASE_PRIVATE_KEY = credentials('FIREBASE_PRIVATE_KEY')

        AWS_REGION = 'eu-north-1'
        ECR_REPO = 'tumbanet'

        ECR_URI = '256274921776.dkr.ecr.eu-north-1.amazonaws.com/tumbanet'
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'devops',
                url: 'https://github.com/benco631/TumbaNet.git'
            }
        }

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
                -t tumbanet:${BUILD_NUMBER} .
                '''
            }
        }

        stage('Login to ECR') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'aws-ecr-creds',
                    usernameVariable: 'AWS_ACCESS_KEY_ID',
                    passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                )]) {

                    sh '''
                    aws ecr get-login-password --region $AWS_REGION | \
                    docker login --username AWS --password-stdin $ECR_URI
                    '''
                }
            }
        }

        stage('Push to ECR') {
            steps {
                sh '''
                docker tag tumbanet:${BUILD_NUMBER} $ECR_URI:${BUILD_NUMBER}

                docker push $ECR_URI:${BUILD_NUMBER}
                '''
            }
        }
    }
}