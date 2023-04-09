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
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
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

export interface RenderProps {
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

export class Render extends Construct {
  constructor(scope: Construct, id: string, props: RenderProps) {
    super(scope, id);

    this.validateProps(props);

    const renderType = props.renderType ? props.renderType : RenderType.CPU;

    const maxvCpus = 8;

    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-batch-alpha-readme.html#compute-environment

    // @ts-ignore
    const blenderSpotCompute = new ComputeEnvironment(this, 'BlenderSpotCompute', {
      computeResources: {
        vpc: props.vpc,
        type: ComputeResourceType.SPOT,
        allocationStrategy: AllocationStrategy.SPOT_CAPACITY_OPTIMIZED,

        minvCpus: 0,
        desiredvCpus: 0,
        maxvCpus,
      },
      enabled: true,
      managed: true,
    });

    // @ts-ignore
    const blenderOnDemandCompute = new ComputeEnvironment(this, 'BlenderOnDemandCompute', {
      computeResources: {
        vpc: props.vpc,
        type: ComputeResourceType.ON_DEMAND,
        allocationStrategy: AllocationStrategy.BEST_FIT_PROGRESSIVE,

        minvCpus: 0,
        desiredvCpus: 4,
        maxvCpus,
      },
      enabled: true,
      managed: true,
    });

    const blenderFargateSpotCompute = new ComputeEnvironment(this, 'BlenderFargateSpotCompute', {
      computeResources: {
        vpc: props.vpc,
        type: ComputeResourceType.FARGATE_SPOT,
        maxvCpus,
      },
      enabled: true,
      managed: true,
    });

    const computeEnvironments = [
      //
      blenderFargateSpotCompute,
      // blenderSpotCompute,
      // blenderOnDemandCompute,
    ];

    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-batch-alpha-readme.html#job-queue
    new JobQueue(this, JobQueue.name, {
      computeEnvironments: computeEnvironments.map((el, index) => ({ computeEnvironment: el, order: index + 1 })),
      enabled: true,
      priority: 10,
    });

    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-batch-alpha-readme.html#job-definition
    new JobDefinition(this, JobDefinition.name, {
      container: {
        image: ContainerImage.fromAsset(`${__dirname}/../../resources/docker`, {
          file: `${renderType}.Dockerfile`,
          platform: Platform.LINUX_ARM64,
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
  private validateProps(props: RenderProps) {
    if (props === undefined) {
      return;
    }
  }
}
