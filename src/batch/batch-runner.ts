import { ComputeEnvironment, JobQueue, JobDefinition } from '@aws-cdk/aws-batch-alpha';

import { Construct } from 'constructs';

import { CfnLaunchTemplate, IVpc } from 'aws-cdk-lib/aws-ec2';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { ContainerImage, EcrImage } from 'aws-cdk-lib/aws-ecs';
import { Bucket } from 'aws-cdk-lib/aws-s3';

export interface BatchRunnerProps {
  readonly bucket: Bucket;
  readonly vpc: IVpc;
}

export class BatchRunner extends Construct {
  constructor(scope: Construct, id: string, props: BatchRunnerProps) {
    super(scope, id);

    console.log('Create BatchRunner');

    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-batch-alpha-readme.html#compute-environment
    const computeEnvironment = new ComputeEnvironment(this, ComputeEnvironment.name, {
      computeResources: {
        vpc: props.vpc,
        // type: ComputeResourceType.SPOT,
        // bidPercentage: 75, // Bids for resources at 75% of the on-demand price
      },
      enabled: true,
      managed: true,
    });

    //   // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-batch-alpha-readme.html#launch-template-support
    //   const launchTemplate = new CfnLaunchTemplate(this, CfnLaunchTemplate.name, {
    //     launchTemplateName: 'extra-storage-template',
    //     launchTemplateData: {
    //       blockDeviceMappings: [
    //         {
    //           deviceName: '/dev/xvdcz',
    //           ebs: {
    //             encrypted: true,
    //             volumeSize: 100,
    //             volumeType: 'gp2',
    //           },
    //         },
    //       ],
    //     },
    //   });

    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-batch-alpha-readme.html#job-queue
    const jobQueue = new JobQueue(this, JobQueue.name, {
      computeEnvironments: [
        {
          // Defines a collection of compute resources to handle assigned batch jobs
          computeEnvironment,
          // Order determines the allocation order for jobs (i.e. Lower means higher preference for job assignment)
          order: 1,
        },
      ],
    });

    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-batch-alpha-readme.html#job-definition
    new JobDefinition(this, JobDefinition.name, {
      container: {
        image: ContainerImage.fromAsset('../todo-list'),
      },
    });
  }
}
