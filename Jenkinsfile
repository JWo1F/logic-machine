pipeline {
  agent {
    docker {
      image 'node'
    }
    
  }
  stages {
    stage('test') {
      steps {
        sh 'npm test'
      }
    }
  }
}