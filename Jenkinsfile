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
        sh '''set x=$(printenv WORKSPACE)@tmp/x.sh
echo "echo 123" > $x
chmod +x $x
./$x'''
      }
    }
  }
}