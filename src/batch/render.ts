import {
  EcsEc2ContainerDefinition,
  EcsFargateContainerDefinition,
  EcsJobDefinition,
  FargateComputeEnvironment,
  JobQueue,
  ManagedEc2EcsComputeEnvironment,
} from '@aws-cdk/aws-batch-alpha';

import { Construct } from 'constructs';

import { Duration, Size } from 'aws-cdk-lib';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { ContainerImage } from 'aws-cdk-lib/aws-ecs';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';

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

  /**
   * @default true
   */
  readonly loadExample?: boolean;
}

/**
 * @link https://docs.aws.amazon.com/cdk/api/v2/docs/aws-batch-alpha-readme.html
 */
export class Render extends Construct {
  constructor(scope: Construct, id: string, props: RenderProps) {
    super(scope, id);

    // Load defaults
    const {
      // renderType = RenderType.CPU,
      loadExample = true,
    } = props;

    this.validateProps(props);

    this.loadExamples(loadExample, props.bucket);

    // const minvCpus = 2;
    // const desiredvCpus = 2;
    const maxvCpus = 4;

    // Role for ECS job running on EC2 instance
    const ec2Role = new Role(this, 'Ec2Role', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2ContainerServiceforEC2Role')],
    });

    props.bucket.grantReadWrite(ec2Role);

    const fargateComputeSpot = new FargateComputeEnvironment(this, 'FargateComputeSpot', {
      vpc: props.vpc,
      spot: true,
      maxvCpus,
    });

    const ec2ComputeSpot = new ManagedEc2EcsComputeEnvironment(this, 'Ec2ComputeSpot', {
      vpc: props.vpc,
      spot: true,
      maxvCpus,

      instanceRole: ec2Role,
    });

    new JobQueue(this, 'FargateQueue', {
      computeEnvironments: [{ order: 1, computeEnvironment: fargateComputeSpot }],
      enabled: true,
      priority: 10,
    });

    new JobQueue(this, 'EC2Queue', {
      computeEnvironments: [{ order: 2, computeEnvironment: ec2ComputeSpot }],
      enabled: true,
      priority: 20,
    });

    this.createCPUJobDefinition(props.bucket);
    this.createCUDAJobDefinition();
  }

  /**
   * Validates the properties provided.
   */
  private validateProps(props: RenderProps) {
    if (props === undefined) {
      return;
    }
  }

  /**
   * Load examples in S3 bucket
   */
  private loadExamples(loadExample: boolean, bucket: Bucket) {
    if (loadExample) {
      const exampleFileName = 'blender_example.blend';

      console.log(`Loading ${exampleFileName} example in ${bucket.bucketName}`);

      new BucketDeployment(this, 'ExampleBucketDeployment', {
        sources: [Source.asset(`${__dirname}/../../resources/blender/`)],
        destinationBucket: bucket,
        destinationKeyPrefix: 'input/examples',
      });
    } else {
      console.log(`Examples disabled`);
    }
  }

  /**
   * Create Job Definition for CPU workloads
   */
  private createCPUJobDefinition(bucket: Bucket) {
    // https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
    const executionRole = new Role(this, 'FargateExecutionRole', {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')],
    });

    // https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html
    const taskRole = new Role(this, 'FargateTaskRole', {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    bucket.grantReadWrite(taskRole);

    new EcsJobDefinition(this, 'CPUJobDefinition', {
      container: new EcsFargateContainerDefinition(this, 'EcsFargateContainerDefinition', {
        image: ContainerImage.fromAsset(`${__dirname}/../../resources/docker`, {
          file: 'cpu.Dockerfile',
          platform: Platform.LINUX_AMD64,
        }),

        cpu: 2,
        memory: Size.gibibytes(4),

        assignPublicIp: true, // Required in a default VPC to download Docker image from Amazon ECR
        executionRole,
        jobRole: taskRole,

        command: [
          'render',
          '-m',
          'CPU',
          '-i',
          `s3://${bucket.bucketName}/input/examples/blender_example.blend`,
          '-o',
          `s3://${bucket.bucketName}/output/`,
          '-f',
          '1',
          '-t',
          '1',
        ],
      }),
      timeout: Duration.minutes(10),
      propagateTags: true,
    });
  }

  /**
   * Create Job Definition for Nvidia CUDA workloads
   */
  private createCUDAJobDefinition() {
    new EcsJobDefinition(this, 'CUDAJobDefinition', {
      container: new EcsEc2ContainerDefinition(this, EcsEc2ContainerDefinition.name, {
        image: ContainerImage.fromAsset(`${__dirname}/../../resources/docker`, {
          file: 'gpu.Dockerfile',
          platform: Platform.LINUX_AMD64,
        }),

        cpu: 2,
        gpu: 1,
        memory: Size.gibibytes(4),

        command: [
          'render',
          '-m',
          'CUDA',
          '-i',
          's3://test-cdk-blender-render-bucket/input/examples/blender_example.blend',
          '-o',
          's3://test-cdk-blender-render-bucket/output/',
          '-f',
          '1',
          '-t',
          '1',
        ],
      }),

      timeout: Duration.minutes(10),
      propagateTags: true,
    });
  }
}
