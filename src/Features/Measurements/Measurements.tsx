import React, { useEffect, useState } from "react";
import LinearProgress from "@material-ui/core/LinearProgress";
import { ApolloProvider, useSubscription, useQuery } from "@apollo/client";
import {
  LineChart, Line, XAxis, CartesianGrid, YAxis, Tooltip,
} from "recharts";
import moment from "moment";
import { useDispatch } from "react-redux";
import MetricSelect from "./MetricSelect";
import MeasurementsService from "./Measurements.service";
import LabeledValueCard from "../../components/LabeledValueCard";
import { actions } from "./Measurements.reducer";

const getMinutesAgoDate = (minutes : number) : number => new Date().getTime() - minutes * 60 * 1000;
const timeRange = getMinutesAgoDate(30);

interface MeasurementI {
  metric: string,
  at: number,
  value: number,
  unit: string
}

interface DisplayedMetrics {
  [key: string]: MeasurementI[]
}

function Measurements() {
  const dispatch = useDispatch();
  const [selectedMetrics, setSelectedMetrics] = useState<MeasurementI["metric"] | undefined[]>([]);
  const [displayedMetricsMeasurements, setDisplayedMetricsMeasurements] = useState<DisplayedMetrics>({});
  const [lineColors, setLineColors] = useState({});

  const { subscribeToNewMeasurements, getMetricsNames, getMultipleMeasurements } = MeasurementsService.queries;

  const { loading: loadingMetricsNames, error: metricsNamesError, data: metricsNamesData } = useQuery(getMetricsNames);

  const {
    loading: loadingMultipleMeasurements,
    error: multipleMeasurementsError,
    data: multipleMeasurementsData,
  } = useQuery(getMultipleMeasurements, {
    variables: {
      /* @ts-ignore */
      input: ((metricsNamesData && metricsNamesData.getMetrics) || []).map((metricName) => ({
        metricName,
        after: timeRange,
      })),
    },
  });

  const { data: newMeasurements, loading: loadingNewMeasurements } = useSubscription(
    subscribeToNewMeasurements, {
      onSubscriptionData: () => {
        if (!loadingNewMeasurements) {
          const rawMeasurement = newMeasurements.newMeasurement;
          const metricName = rawMeasurement.metric;

          if (metricName in displayedMetricsMeasurements) {
            dispatch(actions.metricMeasurementDataReceived({ ...rawMeasurement }));
          }
        }
      },
    },
  );

  const loading = loadingMetricsNames || loadingNewMeasurements;

  useEffect(() => {
    if (
      multipleMeasurementsData
      && "getMultipleMeasurements" in multipleMeasurementsData
      && Object.keys(displayedMetricsMeasurements).length === 0
    ) {
      const rawData = multipleMeasurementsData.getMultipleMeasurements;

      const mappedMultipleMeasurements = rawData.reduce(
        /* @ts-ignore */
        (acc, value) => ({
          ...acc,
          [value.metric]: [...value.measurements],
        }),
        {},
      );

      setDisplayedMetricsMeasurements(mappedMultipleMeasurements);
    }
  }, [selectedMetrics, loadingMultipleMeasurements]);

  useEffect(() => {
    setLineColors(
      /* @ts-ignore */
      ((metricsNamesData && metricsNamesData.getMetrics) || []).reduce(
        /* @ts-ignore */
        (acc, curr) => ({ ...acc, [curr]: `#${`${Math.random().toString(16)}00000`.slice(2, 8)}` }),
        {},
      ),
    );
  }, [metricsNamesData]);

  if (loading) return <LinearProgress />;

  return (
    <div style={{ flex: 1, width: "100%", height: "100%" }}>
      <div>
        { /* @ts-ignore */}
        {selectedMetrics && selectedMetrics.length > 0 && selectedMetrics.map(
          /* @ts-ignore */
          (selectedMetric) => (
            <LabeledValueCard
              label={selectedMetric}
              value={displayedMetricsMeasurements[selectedMetric][0].at}
            />
          ),
        )}
      </div>
      <LineChart width={1500} height={800}>
        <XAxis
          dataKey="at"
          domain={["auto", "auto"]}
          type="number"
          scale="time"
          tickFormatter={(unixTime) => moment(unixTime).format("mm:ss")}
        />
        <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
        <Tooltip labelFormatter={(label) => `${moment(label).format("hh:mm:ss")} hrs.`} />
        { /* @ts-ignore */}
        {selectedMetrics.map((metricName) => (
          <YAxis
            dataKey="value"
            key={`${metricName}-yaxis`}
            yAxisId={metricName}
            name={metricName}
              /* @ts-ignore */
            unit={displayedMetricsMeasurements[metricName][0].unit}
          />
        ))}
        { /* @ts-ignore */}
        {selectedMetrics.map((metricName) => (
          <Line
            key={metricName}
            name={metricName}
            type="linear"
            strokeWidth={2}
            /* @ts-ignore */
            unit={displayedMetricsMeasurements[metricName][0].unit}
            dataKey="value"
            yAxisId={metricName}
            data={displayedMetricsMeasurements[metricName]}
             /* @ts-ignore */
            stroke={lineColors[metricName]}
          />
        ))}
      </LineChart>
      <div>
        { /* @ts-ignore */}
        <MetricSelect {...{ selectedMetrics, setSelectedMetrics, metricsOptions: metricsNamesData.getMetrics }} />
      </div>
    </div>
  );
}

export default () => (
  <ApolloProvider client={MeasurementsService.client}>
    <Measurements />
  </ApolloProvider>
);
