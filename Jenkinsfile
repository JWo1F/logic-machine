pipeline {
  agent {
    docker {
      image 'node'
    }
    
  }
  stages {
    stage('test') {
      steps {
        sh 'echo "123"'
        sh '''echo "console.log(123)" > file.js
node file.js'''
      }
    }
  }
}