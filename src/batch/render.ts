import {
  ComputeEnvironment,
  ComputeResourceType,
  JobDefinition,
  JobQueue,
  PlatformCapabilities,
} from '@aws-cdk/aws-batch-alpha';

import { Construct } from 'constructs';

import { Duration } from 'aws-cdk-lib';
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

    // const minvCpus = 1;
    // const desiredvCpus = 2;
    const maxvCpus = 4;

    // Role for ECS job running on EC2 instance
    // const spotComputeRole = new Role(this, 'SpotComputeRole', {
    //   assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
    //   managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2ContainerServiceforEC2Role')],
    // });

    // props.bucket.grantReadWrite(spotComputeRole);

    // const spotComputeRoleInstanceRole = new CfnInstanceProfile(this, 'SpotComputeRoleInstanceRole', {
    //   roles: [spotComputeRole.roleName],
    // });

    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-batch-alpha-readme.html#compute-environment
    // const spotCompute = new ComputeEnvironment(this, 'SpotCompute', {
    //   computeResources: {
    //     vpc: props.vpc,
    //     type: ComputeResourceType.SPOT,
    //     allocationStrategy: AllocationStrategy.SPOT_CAPACITY_OPTIMIZED,

    //     instanceRole: spotComputeRoleInstanceRole.attrArn,

    //     minvCpus,
    //     desiredvCpus,
    //     maxvCpus,
    //   },
    //   enabled: true,
    //   managed: true,
    // });

    // const onDemandCompute = new ComputeEnvironment(this, 'OnDemandCompute', {
    //   computeResources: {
    //     vpc: props.vpc,
    //     type: ComputeResourceType.ON_DEMAND,
    //     allocationStrategy: AllocationStrategy.BEST_FIT_PROGRESSIVE,

    //     minvCpus,
    //     desiredvCpus,
    //     maxvCpus,
    //   },
    //   enabled: true,
    //   managed: true,
    // });

    const fargateSpotCompute = new ComputeEnvironment(this, 'FargateSpotCompute', {
      computeResources: {
        vpc: props.vpc,
        type: ComputeResourceType.FARGATE_SPOT,
        maxvCpus,
      },
      enabled: true,
      managed: true,
    });

    const computeEnvironments = [
      // spotCompute,
      // onDemandCompute,
      fargateSpotCompute,
    ];

    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-batch-alpha-readme.html#job-queue
    new JobQueue(this, JobQueue.name, {
      computeEnvironments: computeEnvironments.map((el, index) => ({ computeEnvironment: el, order: index + 1 })),
      enabled: true,
      priority: 10,
    });

    this.createCPUJobDefinition(props.bucket);
    // this.createCUDAJobDefinition(fargateExecutionRole);
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
   * @link https://docs.aws.amazon.com/cdk/api/v2/docs/aws-batch-alpha-readme.html#job-definition
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

    const jobMemory = 4096;

    new JobDefinition(this, 'FargateCPUJobDefinition', {
      container: {
        image: ContainerImage.fromAsset(`${__dirname}/../../resources/docker`, {
          file: 'cpu.Dockerfile',
          platform: Platform.LINUX_AMD64,
        }),
        executionRole,
        jobRole: taskRole,
        vcpus: 2,
        memoryLimitMiB: jobMemory,

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
        assignPublicIp: true, // Required in a default VPC to download Docker image from Amazon ECR
      },
      platformCapabilities: [PlatformCapabilities.FARGATE],
      timeout: Duration.minutes(10),
      propagateTags: true,
    });
  }

  /**
   * Create Job Definition for Nvidia CUDA workloads
   * @link https://docs.aws.amazon.com/cdk/api/v2/docs/aws-batch-alpha-readme.html#job-definition
   */
  //   private createCUDAJobDefinition(executionRole: IRole) {
  //     const jobMemory = 4096;

  //     new JobDefinition(this, 'CUDAJobDefinition', {
  //       container: {
  //         image: ContainerImage.fromAsset(`${__dirname}/../../resources/docker`, {
  //           file: 'gpu.Dockerfile',
  //           platform: Platform.LINUX_AMD64,
  //         }),
  //         platformVersion: FargatePlatformVersion.LATEST,
  //         executionRole,

  //         vcpus: 2,
  //         gpuCount: 1,

  //         memoryLimitMiB: jobMemory,

  //         command: [
  //           'render',
  //           '-m',
  //           'CUDA',
  //           '-i',
  //           's3://test-cdk-blender-render-bucket/input/examples/blender_example.blend',
  //           '-o',
  //           's3://test-cdk-blender-render-bucket/output/',
  //           '-f',
  //           '1',
  //           '-t',
  //           '1',
  //         ],

  //         assignPublicIp: false,
  //       },
  //       timeout: Duration.minutes(10),
  //       platformCapabilities: [PlatformCapabilities.FARGATE],
  //       propagateTags: true,
  //     });
  //   }
}
