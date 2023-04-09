import { ComputeEnvironment, ComputeResourceType, JobDefinition, JobQueue } from '@aws-cdk/aws-batch-alpha';

import { Construct } from 'constructs';

import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { ContainerImage } from 'aws-cdk-lib/aws-ecs';
import { Bucket } from 'aws-cdk-lib/aws-s3';

export enum RenderType {
  GPU = 'gpu',
  CPU = 'cpu',
}

export interface BatchRunnerProps {
  /**
   * Bucket used as input (.blender file) and output (frames and video)
   */
  readonly bucket: Bucket;

  /**
   * The Vpc used to deploy the resources
   */
  readonly vpc: IVpc;

  /**
   * @default - RenderType.CPU
   */
  readonly renderType?: RenderType;
}

export class BatchRunner extends Construct {
  constructor(scope: Construct, id: string, props: BatchRunnerProps) {
    super(scope, id);

    //
    const renderType = props.renderType ? props.renderType : RenderType.CPU;

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

    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-batch-alpha-readme.html#job-definition
    new JobDefinition(this, JobDefinition.name, {
      container: {
        image: ContainerImage.fromAsset(`${__dirname}/../../resources/docker`, { file: 'cpu.Dockerfile' }),
        // gpuCount: 1
      },
    });
  }
}
