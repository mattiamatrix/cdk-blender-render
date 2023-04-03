import { Construct } from 'constructs';

import { Bucket } from 'aws-cdk-lib/aws-s3';

export interface BatchRunnerProps {
  readonly bucket: Bucket;
}

export class BatchRunner extends Construct {
  constructor(scope: Construct, id: string, _props: BatchRunnerProps) {
    super(scope, id);

    console.log('hello 5');
  }
}
