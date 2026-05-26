pipeline {
    agent any

    environment {
        VAPID_PUBLIC_KEY = credentials('BJuUc54bTyzjxBuCXz1FJEhXgtvv3ldUObwZDbjrfQd5YSDZmFtYsr11AbLL4-fti_oVJqP8km8cO1Grwzon7G0')
        NEXT_PUBLIC_VAPID_PUBLIC_KEY = credentials('BJuUc54bTyzjxBuCXz1FJEhXgtvv3ldUObwZDbjrfQd5YSDZmFtYsr11AbLL4-fti_oVJqP8km8cO1Grwzon7G0')
        VAPID_PRIVATE_KEY = credentials('FXLehAxfKCTHxTjbfLjyNbmi3bDbWhAP5LzmQGhHktE')
        VAPID_SUBJECT = credentials('mailto:bengilad6@gmail.com')

        NEXT_PUBLIC_FIREBASE_PROJECT_ID = credentials('tumbahub')
        FIREBASE_CLIENT_EMAIL = credentials('firebase-adminsdk-fbsvc@tumbahub.iam.gserviceaccount.com')
        FIREBASE_PRIVATE_KEY = credentials("-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDDD91qQXIU5b0g\nGAHVEIEj4R/Vm5ojIJLCfrf4yiwZpxEpg75YThPyhX3yNBhzOb41J3hQriE52UPL\nxa9ocCIIajbhCrLB3ITEf2y5XmY6mAIZU+oyEfXGeOt1AxwU9k2tdyX3gKrRq2p0\n5RZUoTvMCrBkzyF559MTP4YlLe/C0sBEcYJZdW39iCalJbx9U76nk27NdZf2+S0n\n8P840KriA7TJAAVKcVWwyYxEysfB8dcGGee90Ktt5S0pWNFkIzRpLFLzbtaN73Ot\nE5mxa6AOKcIIBQbfc+oek8iB+qi2G4XAUZjnFaNABNaFJLqo5f6CCRdEAR0q/cSV\ngBux9XcPAgMBAAECggEAGPtrrqOiIkYIMleQyIJ8H6XCB4ANvij6Utma40y1WDW6\n73e1haa+TEXHiyEb7on7L+CVurOKgteuJKd1XylZWn2L+Md/fG+rO2VcfeM2sZNt\nVWQXbwE42on7Efnre03ORgSoAqpidkb/c+gxM3aQ64GE9OxIS84ijOkKW7Gl7uwI\ncyuASxmKYE7g1HfUyXYBWAQpr6ZQ5Hlotslsftt3jbt8U3ZO7v4h1TrqmUANE1nG\nSgQzssngie6qMHGZtgjBto6hR2qyLy6i4qEm85U891dvn/OWy7rg4zv/Eix7nLDH\ncjCpV4gywmxRpP8esTeMbYoXkAUKehbFt4R4WdtjvQKBgQD3yCRvTmOfOGjAkc6L\npJFeIadP0Ne+VxHCv1UhHTocYaGZ7yT40mCNd06cgpjsoqPB+DJQ5xIDGNIAloZW\nTCVlToZ19rHwHgLcsIUW3A7SEnRc83gxneNeFdhbAfIVtjp5Ej8M6tcMu9we/I/o\n1PCuoErvLrYcDVDAhcO7xdkEdQKBgQDJiBc6Zm/PDJNuVJcIyqTrki7dGQMIKJB4\nYwXv8QrDeTrVqe+3KsrWD3WLFsQffZWdgGLJXK6qaYDond6ZiyzFaSyllTzUFH3E\nSS+vS4NPIdYXdjQ1VgJqFZtJcbZSo8H/H65O6zlwme76j/wWD5vGhffjus/sLIGi\nxgcC/qXM8wKBgFz3RdxRMAWUN5FQ44r3QudrfwfuVpP+vRYxjXIwMhZl9yj3VgrZ\nfAp34hHM2i2m1AQ56D78g4CP9nLsBxkn1rwM21w1JAvwZqiAvl6WUCU3cVtSqh0L\nnTw2vAdhUoAc8BFu7CMflXIcpfkmT6RPCMKsN5FIGGGsCUlCpu6zy7nlAoGBALmF\nCC0Ao6isYQPN5wN22H7rISzzm3DlNqk8LvkEoe30KY8LUtsBD5wiuwgBOyXqC9Lj\nnwzSvw+s87gvq/0Yu2w3N5xuV4K8IlKRNM5f607rTRRoAgOfW7WgkkT34ukMSse6\nuFF6BHR9oBsUdPEyCSqlpN8E1+cHyYa4WTgOhz61AoGBALENX2UxUbUFq2U3LCmB\nRCMwAj69gmMAZKXoySmfHWBq4HcUjWTalXAXDKv8H8p3qcfGUp3MPqK7QsjU0f1U\niA+FMZ513EuP97AWNy5D6dogZZxFdK261U9SrpEVaqDdUd94kDPNK4CKz8mgyFPf\nucMzLHpZGNKCBnm5PvjgZ44z\n-----END PRIVATE KEY-----\n")
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