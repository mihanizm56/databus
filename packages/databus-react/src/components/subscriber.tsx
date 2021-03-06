import React, { ComponentType, PureComponent } from 'react';
import { uniqueId } from 'lodash-es';
import { Databus } from '@ravilm/databus';
import { mapperValues } from '../utils/mapped-values';
import { StateType, StateToPropsMapperType } from '../types';

type AccumType<StateToProps> = {
  eventsMeta: { [key in keyof StateToProps]?: string };
} & StateType<StateToProps>;

type getStateToPropsType<StateToProps> = {
  [key: string]: StateToPropsMapperType<StateToProps>;
};

type PropsType<StateToProps> = {
  getStateToProps: getStateToPropsType<StateToProps>;
};

export const subscriber = <
  StateToProps extends Record<string, string>,
  OwnProps extends Record<string, string>
>({
  getStateToProps,
}: PropsType<StateToProps>) => (WrappedComponent: ComponentType<OwnProps>) =>
  class extends PureComponent<OwnProps, StateType<StateToProps>> {
    constructor(props: OwnProps) {
      super(props);

      this.state = Object.keys(getStateToProps).reduce(
        (accum: AccumType<StateToProps>, name: string) => {
          const currentPropValues = getStateToProps[name];
          const databus = new Databus({ name });
          const eventId = uniqueId(`${name}__`);

          databus.addEvent({ eventId });

          databus.addEventListener({
            eventId,
            listener: () =>
              this.setState((prevState: StateType<StateToProps>) => ({
                ...prevState,
                ...mapperValues(currentPropValues, name),
              })),
          });

          return {
            ...accum,
            ...mapperValues(currentPropValues, name),
            eventsMeta: { ...accum.eventsMeta, [name]: eventId },
          };
        },
        {
          eventsMeta: {},
        },
      );
    }

    componentWillUnmount() {
      for (const eventName in this.state.eventsMeta) {
        new Databus({ name: eventName }).removeEventListener({
          eventId: this.state.eventsMeta[eventName],
        });
      }
    }

    render() {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { eventsMeta, ...rest } = this.state;

      return <WrappedComponent {...this.props} {...rest} />;
    }
  };
