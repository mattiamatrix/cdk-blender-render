import {
  AllocationStrategy,
  ComputeEnvironment,
  ComputeResourceType,
  JobDefinition,
  JobQueue,
} from '@aws-cdk/aws-batch-alpha';

import { Construct } from 'constructs';

import { Duration } from 'aws-cdk-lib';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { ContainerImage } from 'aws-cdk-lib/aws-ecs';
import { Bucket } from 'aws-cdk-lib/aws-s3';

export enum RenderType {
  /**
   *
   */
  CPU = 'cpu',

  /**
   *
   */
  GPU = 'gpu',
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
   * @default RenderType.CPU
   */
  readonly renderType?: RenderType;
}

export class BatchRunner extends Construct {
  constructor(scope: Construct, id: string, props: BatchRunnerProps) {
    super(scope, id);

    this.validateProps(props);

    const renderType = props.renderType ? props.renderType : RenderType.CPU;

    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-batch-alpha-readme.html#compute-environment
    const blenderSpotCompute = new ComputeEnvironment(this, 'BlenderSpotCompute', {
      computeResources: {
        vpc: props.vpc,
        type: ComputeResourceType.SPOT,
        allocationStrategy: AllocationStrategy.SPOT_CAPACITY_OPTIMIZED,

        minvCpus: 0,
        desiredvCpus: 0,
        maxvCpus: 16,
      },
      enabled: true,
      managed: true,
    });

    const blenderOnDemandCompute = new ComputeEnvironment(this, 'BlenderOnDemandCompute', {
      computeResources: {
        vpc: props.vpc,
        type: ComputeResourceType.ON_DEMAND,
        allocationStrategy: AllocationStrategy.BEST_FIT_PROGRESSIVE,

        minvCpus: 0,
        desiredvCpus: 4,
        maxvCpus: 8,
      },
      enabled: true,
      managed: true,
    });

    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-batch-alpha-readme.html#job-queue
    new JobQueue(this, JobQueue.name, {
      computeEnvironments: [
        {
          computeEnvironment: blenderOnDemandCompute,
          order: 1,
        },
        {
          computeEnvironment: blenderSpotCompute,
          order: 2,
        },
      ],
      enabled: true,
      priority: 10,
    });

    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-batch-alpha-readme.html#job-definition
    new JobDefinition(this, JobDefinition.name, {
      container: {
        image: ContainerImage.fromAsset(`${__dirname}/../../resources/docker`, {
          file: `${renderType}.Dockerfile`,
        }),
        vcpus: 1,
        // gpuCount: 1
        memoryLimitMiB: 4096,
        // command: ['Ref::action', '-i', 'Ref::inputUri', '-o', 'Ref::outputUri', '-f', 'Ref::framesPerJob'],
      },
      timeout: Duration.minutes(10),
      propagateTags: true,
    });
  }

  /**
   * Validates the properties provided.
   */
  private validateProps(props: BatchRunnerProps) {
    if (props === undefined) {
      return;
    }
  }
}
