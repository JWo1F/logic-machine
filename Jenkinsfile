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
        sh '''echo "echo 123" > $(printenv WORKSPACE)@tmp/x.sh
chmod +x $(printenv WORKSPACE)@tmp/x.sh
./$(printenv WORKSPACE)@tmp/x.sh'''
      }
    }
  }
}