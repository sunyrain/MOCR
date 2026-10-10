import {use} from 'echarts/core';
import {BarChart, PieChart, HeatmapChart} from 'echarts/charts';
import {GridComponent, TooltipComponent, GraphicComponent, VisualMapContinuousComponent, DataZoomSliderComponent, AriaComponent} from 'echarts/components';
import {SVGRenderer} from 'echarts/renderers';
use([BarChart, PieChart, HeatmapChart, GridComponent, TooltipComponent, GraphicComponent, VisualMapContinuousComponent, DataZoomSliderComponent, AriaComponent, SVGRenderer]);
export {init} from 'echarts/core';
