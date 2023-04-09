import { ComputeEnvironment, ComputeResourceType, JobDefinition, JobQueue } from '@aws-cdk/aws-batch-alpha';

import { Construct } from 'constructs';

import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { ContainerImage } from 'aws-cdk-lib/aws-ecs';
import { Bucket } from 'aws-cdk-lib/aws-s3';

export interface BatchRunnerProps {
  readonly bucket: Bucket;
  readonly vpc: IVpc;
}

export class BatchRunner extends Construct {
  constructor(scope: Construct, id: string, props: BatchRunnerProps) {
    super(scope, id);

    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-batch-alpha-readme.html#compute-environment
    const computeEnvironment = new ComputeEnvironment(this, ComputeEnvironment.name, {
      computeResources: {
        vpc: props.vpc,
        type: ComputeResourceType.SPOT,
        bidPercentage: 75, // Bids for resources at 75% of the on-demand price

        minvCpus: 1,
        desiredvCpus: 1,
        maxvCpus: 2,
      },
      enabled: true,
      managed: true,
    });

    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-batch-alpha-readme.html#job-queue
    new JobQueue(this, JobQueue.name, {
      computeEnvironments: [
        {
          // Defines a collection of compute resources to handle assigned batch jobs
          computeEnvironment,
          // Order determines the allocation order for jobs (i.e. Lower means higher preference for job assignment)
          order: 1,
        },
      ],
      enabled: true,
      priority: 1,
    });

    //docs.aws.amazon.com/cdk/api/v2/docs/aws-batch-alpha-readme.html#job-definition
    new JobDefinition(this, JobDefinition.name, {
      container: {
        image: ContainerImage.fromAsset(`${__dirname}/../../resources/docker`),
      },
    });
  }
}
