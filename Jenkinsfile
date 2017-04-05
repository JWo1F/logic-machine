pipeline {
  agent {
    docker {
      image 'node'
    }
    
  }
  stages {
    stage('test') {
      steps {
        sh '''npm i
npm test'''
        sh 'echo "$(printenv WORKSPACE)@tmp"'
      }
    }
  }
}