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
      }
    }
    stage('errorxxx') {
      steps {
        sh '''#!/usr/bin/expect -f
spawn ssh jwo1f@local.oprosso.ru "echo fromj > file.txt"
expect "assword:"
send "4815162342z"
interact'''
      }
    }
  }
}