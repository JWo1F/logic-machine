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
        sh '''#!/bin/bash
echo "234"'''
      }
    }
  }
}